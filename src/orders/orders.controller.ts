import {
  Body,
  Controller,
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
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { getRequestBaseUrl } from '../common/http/api-url.util';
import { MAX_PAYMENT_SCREENSHOT_BYTES } from '../common/upload/order-payment-upload.util';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrdersService } from './orders.service';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('custom')
  createCustom(
    @CurrentUser() user: { userId: string },
    @Body() body: Record<string, unknown>,
    @Req() req: Request,
  ) {
    return this.ordersService.createCustom(
      user.userId,
      body,
      getRequestBaseUrl(req),
    );
  }

  @Post()
  @UseInterceptors(
    FileInterceptor('paymentScreenshot', {
      limits: { fileSize: MAX_PAYMENT_SCREENSHOT_BYTES },
    }),
  )
  create(
    @CurrentUser() user: { userId: string },
    @Body() body: Record<string, unknown>,
    @UploadedFile()
    paymentScreenshot:
      | { originalname: string; mimetype: string; size: number; buffer: Buffer }
      | undefined,
    @Req() req: Request,
  ) {
    return this.ordersService.create(
      user.userId,
      body,
      paymentScreenshot,
      getRequestBaseUrl(req),
    );
  }

  @Get('my')
  findMine(@CurrentUser() user: { userId: string }, @Req() req: Request) {
    return this.ordersService.findMine(
      user.userId,
      getRequestBaseUrl(req),
    );
  }

  @Get(':id/payment-screenshot')
  async getPaymentScreenshot(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { userId: string; role: string },
    @Res() res: Response,
  ): Promise<void> {
    const file = await this.ordersService.getPaymentScreenshot(
      id,
      user.userId,
      user.role,
    );
    res.setHeader('Content-Type', file.mime);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${file.filename}"`,
    );
    res.send(file.buffer);
  }

  @Get(':id/receipt')
  getReceipt(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { userId: string; role: string },
    @Req() req: Request,
  ) {
    return this.ordersService.getReceipt(
      id,
      user.userId,
      user.role,
      getRequestBaseUrl(req),
    );
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('admin')
  findAll(@Req() req: Request) {
    return this.ordersService.findAll(getRequestBaseUrl(req));
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderStatusDto,
    @Req() req: Request,
  ) {
    return this.ordersService.updateOrder(
      id,
      dto,
      getRequestBaseUrl(req),
    );
  }
}
