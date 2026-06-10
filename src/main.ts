import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from './shared/http-exception.filter';
import { ResponseTransformInterceptor } from './shared/response-transform.interceptor';
import * as express from 'express';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();

  app.setGlobalPrefix('api/v1');

  const originEnv = process.env.CORS_ORIGIN ?? 'http://localhost:3000';
  const allowedOrigins = originEnv
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  app.enableCors({
    origin: (requestOrigin, callback) => {
      if (!requestOrigin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(requestOrigin)) {
        return callback(null, true);
      }

      console.error('[CORS] Blocked origin:', requestOrigin);
      return callback(
        new Error(`Not allowed by CORS: ${requestOrigin}`),
        false,
      );
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-silent-auth',
      'idempotency-key',
    ],
  });

  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseTransformInterceptor());

  app.use(express.static(path.join(process.cwd(), 'public')));

  const port = Number(process.env.PORT ?? 8080);
  await app.listen(port);
  console.log(`🚀 API running on port ${port} (prefix: /api/v1)`);
  console.log('[CORS] allowed origins:', allowedOrigins);
}
bootstrap();
