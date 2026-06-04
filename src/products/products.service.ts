import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { isValidUuid } from '../common/validation/uuid.util';
import {
  sanitizeFilename,
  validateImageFile,
} from '../common/upload/image-upload.util';
import { Category } from '../entities/categories.entity';
import { Product } from '../entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

type UploadedFile = {
  mimetype: string;
  size: number;
  originalname: string;
  buffer: Buffer;
};

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
  ) {}

  private buildApiBaseUrl(baseUrl: string): string {
    const apiPrefix = process.env.API_PREFIX?.trim();
    return apiPrefix ? `${baseUrl}/${apiPrefix}` : baseUrl;
  }

  private toProductResponse(product: Product, baseUrl: string) {
    const apiBaseUrl = this.buildApiBaseUrl(baseUrl);
    return {
      id: product.id,
      name: product.name,
      price: Number(product.price),
      discount: Number(product.discount ?? 0),
      imageUrl: `${apiBaseUrl}/products/${product.id}/image`,
      category: product.category
        ? {
            id: product.category.id,
            name: product.category.name,
            imageUrl: `${apiBaseUrl}/categories/${product.category.id}/image`,
          }
        : null,
    };
  }

  async findAll(baseUrl: string) {
    const products = await this.productsRepository.find({ order: { name: 'ASC' } });
    return products.map((product) => this.toProductResponse(product, baseUrl));
  }

  async findImage(id: string): Promise<Product> {
    const product = await this.productsRepository.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  async create(dto: CreateProductDto, file: UploadedFile | undefined, baseUrl: string) {
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

    const product = this.productsRepository.create({
      name: dto.name.trim(),
      price: Number(dto.price),
      discount,
      imageBlob: file!.buffer,
      imageMime: file!.mimetype,
      imageFilename: sanitizeFilename(file!.originalname),
      category,
    });
    const saved = await this.productsRepository.save(product);
    return this.toProductResponse(saved, baseUrl);
  }

  async update(
    id: string,
    dto: UpdateProductDto,
    file: UploadedFile | undefined,
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

    const saved = await this.productsRepository.save(product);
    return this.toProductResponse(saved, baseUrl);
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
