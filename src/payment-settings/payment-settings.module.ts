import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { PaymentSettings } from '../entities/payment-settings.entity';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { UsersModule } from '../users/users.module';
import { PaymentSettingsController } from './payment-settings.controller';
import { PaymentSettingsService } from './payment-settings.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentSettings]),
    AuthModule,
    UsersModule,
  ],
  controllers: [PaymentSettingsController],
  providers: [PaymentSettingsService, JwtAuthGuard, RolesGuard],
  exports: [PaymentSettingsService],
})
export class PaymentSettingsModule {}
