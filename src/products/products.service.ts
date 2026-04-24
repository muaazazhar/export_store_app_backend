import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../entities/categories.entity';
import { Product } from '../entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
  ) {}

  findAll(): Promise<Product[]> {
    return this.productsRepository.find({ order: { id: 'DESC' } });
  }

  async create(dto: CreateProductDto): Promise<Product> {
    if (!dto.name?.trim()) {
      throw new BadRequestException('Product name is required');
    }
    if (!dto.categoryId || dto.categoryId <= 0) {
      throw new BadRequestException('Valid categoryId is required');
    }
    if (dto.price === undefined || Number(dto.price) <= 0) {
      throw new BadRequestException('Price must be greater than zero');
    }

    const category = await this.categoriesRepository.findOne({
      where: { id: dto.categoryId },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const product = this.productsRepository.create({
      name: dto.name.trim(),
      price: Number(dto.price),
      category,
    });
    return this.productsRepository.save(product);
  }

  async update(id: number, dto: UpdateProductDto): Promise<Product> {
    const product = await this.productsRepository.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (dto.categoryId !== undefined) {
      if (dto.categoryId <= 0) {
        throw new BadRequestException('Valid categoryId is required');
      }
      const category = await this.categoriesRepository.findOne({
        where: { id: dto.categoryId },
      });
      if (!category) {
        throw new NotFoundException('Category not found');
      }
      product.category = category;
    }

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

    return this.productsRepository.save(product);
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
