import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  sanitizeFilename,
  validateImageFile,
} from '../common/upload/image-upload.util';
import { Category } from '../entities/categories.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

type UploadedFile = {
  mimetype: string;
  size: number;
  originalname: string;
  buffer: Buffer;
};

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
  ) {}

  private toCategoryResponse(category: Category, baseUrl: string) {
    return {
      id: category.id,
      name: category.name,
      imageUrl: `${baseUrl}/categories/${category.id}/image`,
    };
  }

  async findAll(baseUrl: string) {
    const categories = await this.categoriesRepository.find({ order: { name: 'ASC' } });
    return categories.map((category) => this.toCategoryResponse(category, baseUrl));
  }

  async findImage(id: number): Promise<Category> {
    const category = await this.categoriesRepository.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  async create(dto: CreateCategoryDto, file: UploadedFile | undefined, baseUrl: string) {
    const name = dto.name?.trim();
    if (!name) {
      throw new BadRequestException('Category name is required');
    }
    validateImageFile(file, true);

    const existing = await this.categoriesRepository.findOne({ where: { name } });
    if (existing) {
      throw new BadRequestException('Category already exists');
    }

    const category = this.categoriesRepository.create({
      name,
      imageBlob: file!.buffer,
      imageMime: file!.mimetype,
      imageFilename: sanitizeFilename(file!.originalname),
    });
    const saved = await this.categoriesRepository.save(category);
    return this.toCategoryResponse(saved, baseUrl);
  }

  async update(
    id: number,
    dto: UpdateCategoryDto,
    file: UploadedFile | undefined,
    baseUrl: string,
  ) {
    const category = await this.categoriesRepository.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    if (dto.name !== undefined) {
      const nextName = dto.name.trim();
      if (!nextName) {
        throw new BadRequestException('Category name cannot be empty');
      }
      category.name = nextName;
    }

    if (file) {
      validateImageFile(file, false);
      category.imageBlob = file.buffer;
      category.imageMime = file.mimetype;
      category.imageFilename = sanitizeFilename(file.originalname);
    }

    const saved = await this.categoriesRepository.save(category);
    return this.toCategoryResponse(saved, baseUrl);
  }
}
