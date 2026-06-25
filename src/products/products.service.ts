import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { toProductResponse } from '../common/catalog/catalog-response.util';
import { isValidUuid } from '../common/validation/uuid.util';
import {
  sanitizeFilename,
  validateImageFile,
} from '../common/upload/image-upload.util';
import { UploadedImageFile } from '../common/upload/uploaded-file.type';
import { Category } from '../entities/categories.entity';
import { Order } from '../entities/order.entity';
import { PaymentSettings } from '../entities/payment-settings.entity';
import { Product } from '../entities/product.entity';
import { PaymentSettingsService } from '../payment-settings/payment-settings.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

type OrderQuantityRow = {
  productId: string;
  qty: string;
};

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    private readonly paymentSettingsService: PaymentSettingsService,
  ) {}

  private mapProductsInOrder(
    products: Product[],
    orderedIds: string[],
    limit: number,
    baseUrl: string,
  ) {
    const byId = new Map(products.map((p) => [p.id, p]));
    const result: ReturnType<typeof toProductResponse>[] = [];
    for (const id of orderedIds) {
      if (result.length >= limit) {
        break;
      }
      const product = byId.get(id);
      if (product) {
        result.push(toProductResponse(product, baseUrl));
      }
    }
    return result;
  }

  async findAll(baseUrl: string) {
    const products = await this.productsRepository.find({
      order: { name: 'ASC' },
    });
    return products.map((product) => toProductResponse(product, baseUrl));
  }

  async findByCategory(categoryId: string, baseUrl: string) {
    const category = await this.categoriesRepository.findOne({
      where: { id: categoryId },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const products = await this.productsRepository.find({
      where: { category: { id: categoryId } },
      order: { name: 'ASC' },
    });
    return products.map((product) => toProductResponse(product, baseUrl));
  }

  async findPopular(baseUrl: string) {
    const settings = await this.paymentSettingsService.getOrCreate();
    const limit = this.paymentSettingsService.getPopularProductLimit(settings);

    switch (settings.popularCriteria) {
      case 'highest_discount':
        return this.findPopularByHighestDiscount(limit, baseUrl);
      case 'newest':
        return this.findPopularByNewest(limit, baseUrl);
      case 'featured':
        return this.findPopularByFeatured(settings, limit, baseUrl);
      case 'most_ordered':
      default:
        return this.findPopularByMostOrdered(limit, baseUrl);
    }
  }

  private async findPopularByHighestDiscount(limit: number, baseUrl: string) {
    const products = await this.productsRepository.find({
      order: { discount: 'DESC', createdAt: 'DESC' },
      take: limit,
    });
    return products.map((p) => toProductResponse(p, baseUrl));
  }

  private async findPopularByNewest(limit: number, baseUrl: string) {
    const products = await this.productsRepository.find({
      order: { createdAt: 'DESC' },
      take: limit,
    });
    return products.map((p) => toProductResponse(p, baseUrl));
  }

  private async findPopularByFeatured(
    settings: PaymentSettings,
    limit: number,
    baseUrl: string,
  ) {
    const featuredIds = (settings.featuredProductIds ?? []).filter((id) =>
      isValidUuid(id),
    );
    if (featuredIds.length === 0) {
      return [];
    }

    const featuredProducts = await this.productsRepository.find({
      where: { id: In(featuredIds) },
    });
    const ordered = this.mapProductsInOrder(
      featuredProducts,
      featuredIds,
      limit,
      baseUrl,
    );

    if (ordered.length >= limit) {
      return ordered;
    }

    const usedIds = new Set(ordered.map((p) => p.id));
    const fillProducts = await this.productsRepository.find({
      order: { createdAt: 'DESC' },
      take: limit + featuredIds.length,
    });
    for (const product of fillProducts) {
      if (ordered.length >= limit) {
        break;
      }
      if (!usedIds.has(product.id)) {
        ordered.push(toProductResponse(product, baseUrl));
        usedIds.add(product.id);
      }
    }

    return ordered;
  }

  private async findPopularByMostOrdered(limit: number, baseUrl: string) {
    const rows = (await this.ordersRepository.query(`
      SELECT elem->>'productId' AS "productId",
             SUM((elem->>'quantity')::numeric) AS qty
      FROM "order" o,
      jsonb_array_elements(o.items::jsonb) elem
      WHERE COALESCE(o."orderType", 'catalog') = 'catalog'
        AND elem->>'productId' IS NOT NULL
        AND elem->>'productId' <> ''
      GROUP BY elem->>'productId'
      ORDER BY qty DESC
    `)) as OrderQuantityRow[];

    const qtyByProductId = new Map(
      rows.map((row) => [row.productId, Number(row.qty)]),
    );

    const rankedIds = rows
      .map((row) => row.productId)
      .filter((id) => isValidUuid(id));

    if (rankedIds.length === 0) {
      return this.findPopularByNewest(limit, baseUrl);
    }

    const products = await this.productsRepository.find({
      where: { id: In(rankedIds.slice(0, limit * 2)) },
    });

    const sorted = [...products].sort((a, b) => {
      const qtyA = qtyByProductId.get(a.id) ?? 0;
      const qtyB = qtyByProductId.get(b.id) ?? 0;
      if (qtyB !== qtyA) {
        return qtyB - qtyA;
      }
      return a.name.localeCompare(b.name);
    });

    return sorted.slice(0, limit).map((p) => toProductResponse(p, baseUrl));
  }

  async findImage(id: string): Promise<Product> {
    const product = await this.productsRepository
      .createQueryBuilder('product')
      .addSelect('product.imageBlob')
      .where('product.id = :id', { id })
      .getOne();
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  async create(
    dto: CreateProductDto,
    file: UploadedImageFile | undefined,
    baseUrl: string,
  ) {
    if (!dto.name?.trim()) {
      throw new BadRequestException('Product name is required');
    }
    if (!dto.categoryId || !isValidUuid(dto.categoryId)) {
      throw new BadRequestException('A valid categoryId is required');
    }
    if (dto.price === undefined || Number(dto.price) <= 0) {
      throw new BadRequestException('Price must be greater than zero');
    }
    const discount = dto.discount === undefined ? 0 : Number(dto.discount);
    if (Number.isNaN(discount) || discount < 0 || discount > 100) {
      throw new BadRequestException('Discount must be between 0 and 100');
    }
    validateImageFile(file, true);

    const category = await this.categoriesRepository.findOne({
      where: { id: dto.categoryId },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const saved = await this.productsRepository.save(
      this.productsRepository.create({
        name: dto.name.trim(),
        price: Number(dto.price),
        discount,
        imageBlob: file!.buffer,
        imageMime: file!.mimetype,
        imageFilename: sanitizeFilename(file!.originalname),
        category,
      }),
    );
    return toProductResponse(saved, baseUrl);
  }

  async update(
    id: string,
    dto: UpdateProductDto,
    file: UploadedImageFile | undefined,
    baseUrl: string,
  ) {
    const product = await this.productsRepository.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (!dto.categoryId || !isValidUuid(dto.categoryId)) {
      throw new BadRequestException('A valid categoryId is required');
    }
    const category = await this.categoriesRepository.findOne({
      where: { id: dto.categoryId },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    product.category = category;

    if (dto.name !== undefined) {
      const nextName = dto.name.trim();
      if (!nextName) {
        throw new BadRequestException('Product name cannot be empty');
      }
      product.name = nextName;
    }
    if (dto.price !== undefined) {
      if (Number(dto.price) <= 0) {
        throw new BadRequestException('Price must be greater than zero');
      }
      product.price = Number(dto.price);
    }
    if (dto.discount !== undefined) {
      const discount = Number(dto.discount);
      if (Number.isNaN(discount) || discount < 0 || discount > 100) {
        throw new BadRequestException('Discount must be between 0 and 100');
      }
      product.discount = discount;
    }
    if (file) {
      validateImageFile(file, false);
      product.imageBlob = file.buffer;
      product.imageMime = file.mimetype;
      product.imageFilename = sanitizeFilename(file.originalname);
    }

    return toProductResponse(
      await this.productsRepository.save(product),
      baseUrl,
    );
  }

  async remove(id: string): Promise<{ message: string }> {
    const product = await this.productsRepository.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    await this.productsRepository.remove(product);
    return { message: 'Product deleted successfully' };
  }
}
