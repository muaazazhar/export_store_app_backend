import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
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
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get('popular')
  @UseGuards(JwtAuthGuard, VerifiedAuthGuard)
  findPopular(
    @Req() req: Request,
    @Query() query: Record<string, unknown>,
  ) {
    return this.productsService.findPopular(getRequestBaseUrl(req), query);
  }

  @Get()
  @UseGuards(JwtAuthGuard, VerifiedAuthGuard, RolesGuard)
  @Roles('admin')
  findAll(@Req() req: Request, @Query() query: Record<string, unknown>) {
    return this.productsService.findAll(getRequestBaseUrl(req), query);
  }

  @Get(':id/image')
  async getImage(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ): Promise<void> {
    const product = await this.productsService.findImage(id);
    res.setHeader('Content-Type', product.imageMime);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${product.imageFilename}"`,
    );
    res.send(product.imageBlob);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @UseInterceptors(FileInterceptor('image', { limits: { fileSize: MAX_IMAGE_SIZE_BYTES } }))
  create(
    @Body() dto: CreateProductDto,
    @UploadedFile() file: { originalname: string; mimetype: string; size: number; buffer: Buffer },
    @Req() req: Request,
  ) {
    return this.productsService.create(
      dto,
      file,
      getRequestBaseUrl(req),
    );
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @UseInterceptors(FileInterceptor('image', { limits: { fileSize: MAX_IMAGE_SIZE_BYTES } }))
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
    @UploadedFile() file: { originalname: string; mimetype: string; size: number; buffer: Buffer },
    @Req() req: Request,
  ) {
    return this.productsService.update(
      id,
      dto,
      file,
      getRequestBaseUrl(req),
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.remove(id);
  }
}
