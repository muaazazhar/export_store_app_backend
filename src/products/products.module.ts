import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from '../entities/categories.entity';
import { Order } from '../entities/order.entity';
import { Product } from '../entities/product.entity';
import { PaymentSettingsModule } from '../payment-settings/payment-settings.module';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, Category, Order]),
    PaymentSettingsModule,
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
