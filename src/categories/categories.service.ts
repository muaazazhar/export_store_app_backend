import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { toCategoryResponse } from '../common/catalog/catalog-response.util';
import {
  sanitizeFilename,
  validateImageFile,
} from '../common/upload/image-upload.util';
import { UploadedImageFile } from '../common/upload/uploaded-file.type';
import { Category } from '../entities/categories.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
  ) {}

  async findAll(baseUrl: string) {
    const categories = await this.categoriesRepository.find({
      order: { name: 'ASC' },
    });
    return categories.map((category) => toCategoryResponse(category, baseUrl));
  }

  async findImage(id: string): Promise<Category> {
    const category = await this.categoriesRepository
      .createQueryBuilder('category')
      .addSelect('category.imageBlob')
      .where('category.id = :id', { id })
      .getOne();
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  async create(
    dto: CreateCategoryDto,
    file: UploadedImageFile | undefined,
    baseUrl: string,
  ) {
    const name = dto.name?.trim();
    if (!name) {
      throw new BadRequestException('Category name is required');
    }
    validateImageFile(file, true);

    const existing = await this.categoriesRepository.findOne({
      where: { name },
    });
    if (existing) {
      throw new BadRequestException('Category already exists');
    }

    const saved = await this.categoriesRepository.save(
      this.categoriesRepository.create({
        name,
        imageBlob: file!.buffer,
        imageMime: file!.mimetype,
        imageFilename: sanitizeFilename(file!.originalname),
      }),
    );
    return toCategoryResponse(saved, baseUrl);
  }

  async update(
    id: string,
    dto: UpdateCategoryDto,
    file: UploadedImageFile | undefined,
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

    return toCategoryResponse(
      await this.categoriesRepository.save(category),
      baseUrl,
    );
  }

  async delete(id: string, baseUrl: string) {
    const category = await this.categoriesRepository.findOne({ where: { id } });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    await this.categoriesRepository.remove(category);
    return { message: 'Category deleted', id };
  }
}
