import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.enableCors({
    origin: config.get<string>('CORS_ORIGIN', '*'),
    methods: config.get<string>('CORS_METHODS', 'GET,POST'),
    allowedHeaders: config.get<string>('CORS_HEADERS', 'Content-Type,Authorization'),
    credentials: config.get<boolean>('CORS_CREDENTIALS', true),
  });

  const port = config.get<number>('PORT', 3021);
  const host = config.get<string>('HOST', '0.0.0.0');
  await app.listen(port, host);
  Logger.log(`Waitlist service listening on ${host}:${port}`, 'Bootstrap');
}

bootstrap();
