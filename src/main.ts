import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as dotenv from 'dotenv';
import { AppModule } from './app.module';
import { getConfiguredPublicBaseUrl } from './common/http/api-url.util';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { getNestLogLevels } from './common/logging/log-level.util';

dotenv.config({ path: '.env' });
dotenv.config({ path: 'src/.env' });

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: getNestLogLevels(),
  });
  const logger = new Logger('Bootstrap');

  // Required so req.protocol reflects https behind Railway / reverse proxies.
  app.set('trust proxy', 1);

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
  const publicBase = getConfiguredPublicBaseUrl();
  logger.log(`Store backend running at http://${displayHost}:${port}${prefixPath}`);
  if (publicBase) {
    logger.log(`Public asset base URL: ${publicBase}`);
  }
  logger.log(`Bind address: ${host}:${port}`);
  logger.debug(`CORS origins: ${allowedOrigins.join(', ')}`);
}
bootstrap();
