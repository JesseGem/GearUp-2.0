import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import {
  DocumentBuilder,
  SwaggerModule,
} from '@nestjs/swagger';

import { AppModule } from './app.module.js';
import { HttpExceptionFilter } from './core/filters/http-exception.filter.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // -----------------------------
  // CORS
  // -----------------------------

  const corsOrigins = (
    process.env.CORS_ORIGINS ?? ''
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const isProduction =
    process.env.NODE_ENV === 'production';

  app.enableCors({
    origin:
      corsOrigins.length > 0
        ? corsOrigins
        : isProduction
          ? false
          : true,
    credentials: true,
  });

  // -----------------------------
  // Global validation
  // -----------------------------

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // -----------------------------
  // Global exception handling
  // -----------------------------

  app.useGlobalFilters(
    new HttpExceptionFilter(),
  );

  // -----------------------------
  // Swagger / OpenAPI
  // -----------------------------

  const swaggerConfig = new DocumentBuilder()
    .setTitle('GearUp API')
    .setDescription(
      'API documentation for the GearUp vehicle service platform.',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description:
          'Enter your JWT access token',
      },
      'access-token',
    )
    .build();

  const swaggerDocument =
    SwaggerModule.createDocument(
      app,
      swaggerConfig,
    );

  SwaggerModule.setup(
    'api',
    app,
    swaggerDocument,
  );

  await app.listen(
    process.env.PORT ?? 3000,
  );
}

bootstrap();