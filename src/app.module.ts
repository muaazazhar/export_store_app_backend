import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as dotenv from 'dotenv';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { HttpLoggingInterceptor } from './common/interceptors/http-logging.interceptor';
import { OrdersModule } from './orders/orders.module';
import { PaymentSettingsModule } from './payment-settings/payment-settings.module';
import { ProductsModule } from './products/products.module';
import { UsersModule } from './users/users.module';

dotenv.config({ path: '.env' });
dotenv.config({ path: 'src/.env' });

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 5432),
      username: process.env.DB_USERNAME ?? 'postgres',
      password: process.env.DB_PASSWORD ?? 'postgres',
      database: process.env.DB_NAME ?? 'store_db',
      autoLoadEntities: true,
      synchronize: false,
      migrationsRun: false,
      ssl:
        process.env.DB_SSLMODE === 'require'
          ? { rejectUnauthorized: false }
          : false,
    }),
    UsersModule,
    AuthModule,
    CategoriesModule,
    ProductsModule,
    OrdersModule,
    PaymentSettingsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpLoggingInterceptor,
    },
  ],
})
export class AppModule {}
