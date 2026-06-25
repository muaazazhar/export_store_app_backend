import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { toProductResponse } from '../common/catalog/catalog-response.util';
import {
  parsePaginationQuery,
  toPaginatedResponse,
} from '../common/http/pagination.util';
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

  async findAll(baseUrl: string, query: Record<string, unknown> = {}) {
    const { page, limit, skip } = parsePaginationQuery(query, 12);
    const [products, total] = await this.productsRepository.findAndCount({
      order: { id: 'ASC' },
      skip,
      take: limit,
    });

    return toPaginatedResponse(
      products.map((product) => toProductResponse(product, baseUrl)),
      page,
      limit,
      total,
    );
  }

  async findByCategory(
    categoryId: string,
    baseUrl: string,
    query: Record<string, unknown> = {},
  ) {
    const category = await this.categoriesRepository.findOne({
      where: { id: categoryId },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const { page, limit, skip } = parsePaginationQuery(query, 12);
    const [products, total] = await this.productsRepository.findAndCount({
      where: { category: { id: categoryId } },
      order: { name: 'ASC', id: 'ASC' },
      skip,
      take: limit,
    });

    return toPaginatedResponse(
      products.map((product) => toProductResponse(product, baseUrl)),
      page,
      limit,
      total,
    );
  }

  async findPopular(baseUrl: string, query: Record<string, unknown> = {}) {
    const { page, limit, skip } = parsePaginationQuery(query, 12);
    const settings = await this.paymentSettingsService.getOrCreate();

    switch (settings.popularCriteria) {
      case 'highest_discount':
        return this.findPopularByHighestDiscount(page, limit, skip, baseUrl);
      case 'newest':
        return this.findPopularByNewest(page, limit, skip, baseUrl);
      case 'featured':
        return this.findPopularByFeatured(settings, page, limit, skip, baseUrl);
      case 'most_ordered':
      default:
        return this.findPopularByMostOrdered(page, limit, skip, baseUrl);
    }
  }

  private async findPopularByHighestDiscount(
    page: number,
    limit: number,
    skip: number,
    baseUrl: string,
  ) {
    const [products, total] = await this.productsRepository.findAndCount({
      order: { discount: 'DESC', createdAt: 'DESC', id: 'ASC' },
      skip,
      take: limit,
    });

    return toPaginatedResponse(
      products.map((product) => toProductResponse(product, baseUrl)),
      page,
      limit,
      total,
    );
  }

  private async findPopularByNewest(
    page: number,
    limit: number,
    skip: number,
    baseUrl: string,
  ) {
    const [products, total] = await this.productsRepository.findAndCount({
      order: { createdAt: 'DESC', id: 'ASC' },
      skip,
      take: limit,
    });

    return toPaginatedResponse(
      products.map((product) => toProductResponse(product, baseUrl)),
      page,
      limit,
      total,
    );
  }

  private async findPopularByFeatured(
    settings: PaymentSettings,
    page: number,
    limit: number,
    skip: number,
    baseUrl: string,
  ) {
    const featuredIds = (settings.featuredProductIds ?? []).filter((id) =>
      isValidUuid(id),
    );
    if (featuredIds.length === 0) {
      return toPaginatedResponse([], page, limit, 0);
    }

    const featuredProducts = await this.productsRepository.find({
      where: { id: In(featuredIds) },
    });
    const ordered = this.mapProductsInOrder(
      featuredProducts,
      featuredIds,
      featuredIds.length,
      baseUrl,
    );

    const usedIds = new Set(ordered.map((product) => product.id));
    const fillProducts = await this.productsRepository.find({
      order: { createdAt: 'DESC', id: 'ASC' },
    });
    for (const product of fillProducts) {
      if (!usedIds.has(product.id)) {
        ordered.push(toProductResponse(product, baseUrl));
        usedIds.add(product.id);
      }
    }

    const total = ordered.length;
    const data = ordered.slice(skip, skip + limit);
    return toPaginatedResponse(data, page, limit, total);
  }

  private async findPopularByMostOrdered(
    page: number,
    limit: number,
    skip: number,
    baseUrl: string,
  ) {
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

    const rankedIds = rows
      .map((row) => row.productId)
      .filter((id) => isValidUuid(id));

    if (rankedIds.length === 0) {
      return this.findPopularByNewest(page, limit, skip, baseUrl);
    }

    const total = rankedIds.length;
    const pageIds = rankedIds.slice(skip, skip + limit);
    if (pageIds.length === 0) {
      return toPaginatedResponse([], page, limit, total);
    }

    const products = await this.productsRepository.find({
      where: { id: In(pageIds) },
    });
    const productsById = new Map(products.map((product) => [product.id, product]));
    const data = pageIds
      .map((id) => productsById.get(id))
      .filter((product): product is Product => Boolean(product))
      .map((product) => toProductResponse(product, baseUrl));

    return toPaginatedResponse(data, page, limit, total);
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
