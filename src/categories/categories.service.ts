import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../entities/categories.entity';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
  ) {}

  findAll(): Promise<Category[]> {
    return this.categoriesRepository.find({ order: { name: 'ASC' } });
  }

  async create(dto: CreateCategoryDto): Promise<Category> {
    const name = dto.name?.trim();
    if (!name) {
      throw new BadRequestException('Category name is required');
    }

    const existing = await this.categoriesRepository.findOne({ where: { name } });
    if (existing) {
      throw new BadRequestException('Category already exists');
    }

    const category = this.categoriesRepository.create({ name });
    return this.categoriesRepository.save(category);
  }
}
