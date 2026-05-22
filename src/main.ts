import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as dotenv from 'dotenv';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { getNestLogLevels } from './common/logging/log-level.util';

dotenv.config({ path: '.env' });
dotenv.config({ path: 'src/.env' });

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: getNestLogLevels(),
  });
  const logger = new Logger('Bootstrap');

  app.useGlobalFilters(new HttpExceptionFilter());

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
  logger.log(`Store backend running at http://${displayHost}:${port}${prefixPath}`);
  logger.log(`Bind address: ${host}:${port}`);
  logger.debug(`CORS origins: ${allowedOrigins.join(', ')}`);
}
bootstrap();
