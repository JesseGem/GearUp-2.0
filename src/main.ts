import type { NestApplicationOptions } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const options: NestApplicationOptions = {};
  const app = await NestFactory.create(AppModule, options);

  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
