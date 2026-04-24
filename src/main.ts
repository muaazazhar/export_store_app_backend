import { NestFactory } from '@nestjs/core';
import * as dotenv from 'dotenv';
import { AppModule } from './app.module';

dotenv.config({ path: '.env' });
dotenv.config({ path: 'src/.env' });

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  console.log(`Store backend is running on http://localhost:${port}`);
}
bootstrap();
