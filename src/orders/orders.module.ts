import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Order } from '../entities/order.entity';
import { Product } from '../entities/product.entity';
import { Users } from '../entities/users.entity';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PaymentSettingsModule } from '../payment-settings/payment-settings.module';
import { UsersModule } from '../users/users.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, Users, Product]),
    AuthModule,
    UsersModule,
    PaymentSettingsModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService, JwtAuthGuard, RolesGuard],
})
export class OrdersModule {}
