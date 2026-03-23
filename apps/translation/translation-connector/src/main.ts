import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  const PORT = configService.get<number>('PORT', 3009);
  const HOST = configService.get<string>('HOST', '0.0.0.0');

  app.enableCors({
    origin: configService.get<string>('CORS_ORIGIN', '*'),
    methods: configService.get<string>('CORS_METHODS', 'GET,POST'),
    allowedHeaders: configService.get<string>(
      'CORS_HEADERS',
      'Content-Type,Authorization',
    ),
    credentials: configService.get<boolean>('CORS_CREDENTIALS', true),
  });

  await app.listen(PORT, HOST);
}
bootstrap();
