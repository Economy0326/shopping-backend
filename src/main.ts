import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import cookieParser from "cookie-parser";
import { ValidationPipe } from "@nestjs/common";
import { HttpExceptionFilter } from "./shared/http-exception.filter";
import { ResponseTransformInterceptor } from "./shared/response-transform.interceptor";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  
  // prefix
  app.setGlobalPrefix("api/v1");

  // CORS (정확한 origin만 허용, credentials=true)
  const origin = process.env.CORS_ORIGIN ?? "http://localhost:3000";
  app.enableCors({
    origin,
    credentials: true,
  });

  // cookie parser
  app.use(cookieParser());

  // validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // common filter / interceptor
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseTransformInterceptor());

  const port = Number(process.env.PORT ?? 8080);
  await app.listen(port);

  // eslint-disable-next-line no-console
  console.log(`🚀 API running on http://localhost:${port}/api/v1`);
}
bootstrap();
