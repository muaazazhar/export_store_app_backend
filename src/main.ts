import { NestFactory } from '@nestjs/core';
import * as dotenv from 'dotenv';
import { AppModule } from './app.module';

dotenv.config({ path: '.env' });
dotenv.config({ path: 'src/.env' });

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const apiPrefix = process.env.API_PREFIX?.trim();
  if (apiPrefix) {
    app.setGlobalPrefix(apiPrefix);
  }
  const allowedOrigins = (
    process.env.CORS_ORIGINS ??
    'http://localhost:8081,http://127.0.0.1:8081,http://localhost:19006,http://127.0.0.1:19006'
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  const prefixPath = apiPrefix ? `/${apiPrefix}` : '';
  console.log(`Store backend is running on http://localhost:${port}${prefixPath}`);
  console.log(`CORS allowed origins: ${allowedOrigins.join(', ')}`);
}
bootstrap();
