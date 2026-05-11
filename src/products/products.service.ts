import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

  private toProductResponse(product: Product, baseUrl: string) {
    return {
      id: product.id,
      name: product.name,
      price: Number(product.price),
      imageUrl: `${baseUrl}/products/${product.id}/image`,
      category: product.category
        ? {
            id: product.category.id,
            name: product.category.name,
            imageUrl: `${baseUrl}/categories/${product.category.id}/image`,
          }
        : null,
    };
  }

  async findAll(baseUrl: string) {
    const products = await this.productsRepository.find({ order: { id: 'DESC' } });
    return products.map((product) => this.toProductResponse(product, baseUrl));
  }

  async findImage(id: number): Promise<Product> {
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
    if (!dto.categoryId || dto.categoryId <= 0) {
      throw new BadRequestException('categoryId is required');
    }
    if (dto.price === undefined || Number(dto.price) <= 0) {
      throw new BadRequestException('Price must be greater than zero');
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
      imageBlob: file!.buffer,
      imageMime: file!.mimetype,
      imageFilename: sanitizeFilename(file!.originalname),
      category,
    });
    const saved = await this.productsRepository.save(product);
    return this.toProductResponse(saved, baseUrl);
  }

  async update(
    id: number,
    dto: UpdateProductDto,
    file: UploadedFile | undefined,
    baseUrl: string,
  ) {
    const product = await this.productsRepository.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (dto.categoryId === undefined || Number(dto.categoryId) <= 0) {
      throw new BadRequestException('categoryId is required');
    }
    const category = await this.categoriesRepository.findOne({
      where: { id: Number(dto.categoryId) },
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
    if (file) {
      validateImageFile(file, false);
      product.imageBlob = file.buffer;
      product.imageMime = file.mimetype;
      product.imageFilename = sanitizeFilename(file.originalname);
    }

    const saved = await this.productsRepository.save(product);
    return this.toProductResponse(saved, baseUrl);
  }

  async remove(id: number): Promise<{ message: string }> {
    const product = await this.productsRepository.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    await this.productsRepository.remove(product);
    return { message: 'Product deleted successfully' };
  }
}
