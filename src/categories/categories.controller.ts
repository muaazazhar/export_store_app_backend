import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { VerifiedAuthGuard } from '../common/guards/verified-auth.guard';
import { getRequestBaseUrl } from '../common/http/api-url.util';
import { MAX_IMAGE_SIZE_BYTES } from '../common/upload/image-upload.util';
import { ProductsService } from '../products/products.service';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Controller('categories')
export class CategoriesController {
  constructor(
    private readonly categoriesService: CategoriesService,
    private readonly productsService: ProductsService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard, VerifiedAuthGuard)
  findAll(@Req() req: Request) {
    return this.categoriesService.findAll(getRequestBaseUrl(req));
  }

  @Get(':categoryId/products')
  @UseGuards(JwtAuthGuard, VerifiedAuthGuard)
  findCategoryProducts(
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
    @Req() req: Request,
  ) {
    return this.productsService.findByCategory(
      categoryId,
      getRequestBaseUrl(req),
    );
  }

  @Get(':id/image')
  async getImage(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ): Promise<void> {
    const category = await this.categoriesService.findImage(id);
    res.setHeader('Content-Type', category.imageMime);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${category.imageFilename}"`,
    );
    res.send(category.imageBlob);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @UseInterceptors(
    FileInterceptor('image', { limits: { fileSize: MAX_IMAGE_SIZE_BYTES } }),
  )
  create(
    @Body() dto: CreateCategoryDto,
    @UploadedFile()
    file: {
      originalname: string;
      mimetype: string;
      size: number;
      buffer: Buffer;
    },
    @Req() req: Request,
  ) {
    return this.categoriesService.create(
      dto,
      file,
      getRequestBaseUrl(req),
    );
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @UseInterceptors(
    FileInterceptor('image', { limits: { fileSize: MAX_IMAGE_SIZE_BYTES } }),
  )
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
    @UploadedFile()
    file: {
      originalname: string;
      mimetype: string;
      size: number;
      buffer: Buffer;
    },
    @Req() req: Request,
  ) {
    return this.categoriesService.update(
      id,
      dto,
      file,
      getRequestBaseUrl(req),
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  async remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.categoriesService.delete(
      id,
      getRequestBaseUrl(req),
    );
  }
}
