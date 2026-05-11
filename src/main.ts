import { NestFactory } from '@nestjs/core';
import * as dotenv from 'dotenv';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';

dotenv.config({ path: '.env' });
dotenv.config({ path: 'src/.env' });

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use((req: Request, res: Response, next: NextFunction) => {
    const startedAt = Date.now();

    res.on('finish', () => {
      const durationMs = Date.now() - startedAt;
      console.log(
        `[HTTP] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${durationMs}ms)`,
      );
    });

    next();
  });

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
  const host = process.env.SERVER_HOST?.trim() || '0.0.0.0';
  await app.listen(port, host);
  const prefixPath = apiPrefix ? `/${apiPrefix}` : '';
  const displayHost = host === '0.0.0.0' ? 'localhost' : host;
  console.log(
    `Store backend is running on http://${displayHost}:${port}${prefixPath}`,
  );
  console.log(`Server bind address: ${host}:${port}`);
  console.log(`CORS allowed origins: ${allowedOrigins.join(', ')}`);
}
bootstrap();
