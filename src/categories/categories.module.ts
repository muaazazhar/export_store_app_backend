import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Category } from '../entities/categories.entity';
import { UsersModule } from '../users/users.module';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Category]), AuthModule, UsersModule],
  controllers: [CategoriesController],
  providers: [CategoriesService, JwtAuthGuard, RolesGuard],
  exports: [CategoriesService],
})
export class CategoriesModule {}
