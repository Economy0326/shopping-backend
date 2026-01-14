import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import cookieParser from "cookie-parser";
import { ValidationPipe } from "@nestjs/common";
import { HttpExceptionFilter } from "./shared/http-exception.filter";
import { ResponseTransformInterceptor } from "./shared/response-transform.interceptor";
import * as express from "express";
import * as path from "path";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();

  app.setGlobalPrefix("api/v1");

  const origin = process.env.CORS_ORIGIN ?? "http://localhost:3000";
  app.enableCors({ origin, credentials: true });

  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseTransformInterceptor());

  // ✅ 정적 파일: public 폴더를 루트로 제공
  app.use(express.static(path.join(process.cwd(), "public")));

  const port = Number(process.env.PORT ?? 8080);
  await app.listen(port);
  console.log(`🚀 API running on http://localhost:${port}/api/v1`);
}
bootstrap();