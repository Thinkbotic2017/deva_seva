import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';

const logger = new Logger('Bootstrap');

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    // Capture raw body for Razorpay/Gupshup HMAC webhook verification
    rawBody: true,
  });

  // Global prefix — all endpoints at /api/v1/...
  app.setGlobalPrefix('api/v1');

  // Global validation pipe — enforces class-validator decorators on all DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,         // Strip unknown properties
      forbidNonWhitelisted: true,
      transform: true,         // Auto-transform query/body to DTO class instances
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // CORS — only allow configured admin and web URLs
  const adminUrl = process.env['ADMIN_URL'] ?? 'http://localhost:3000';
  const webUrl = process.env['WEB_URL'] ?? 'http://localhost:3002';

  app.enableCors({
    origin: [adminUrl, webUrl],
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
    credentials: true,
  });

  const port = parseInt(process.env['PORT'] ?? '3001', 10);
  await app.listen(port);

  logger.log(`DevaSeva API running on port ${port}`);
  logger.log(`Environment: ${process.env['NODE_ENV'] ?? 'development'}`);
}

bootstrap().catch((err: unknown) => {
  logger.error('Failed to start application', err);
  process.exit(1);
});
