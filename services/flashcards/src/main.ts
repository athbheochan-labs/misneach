import { Logger, LogLevel } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  const logLevels: LogLevel[] =
    process.env.NODE_ENV === 'production'
      ? ['log', 'error', 'warn']
      : ['log', 'error', 'warn', 'debug', 'verbose'];

  app.useLogger(logLevels);

  const port = configService.get<number>('PORT', 3012);
  const host = configService.get<string>('HOST', '0.0.0.0');

  app.enableCors({
    origin: configService.get<string>('CORS_ORIGIN', '*'),
    methods: configService.get<string>('CORS_METHODS', 'GET,POST,PUT,DELETE'),
    allowedHeaders: configService.get<string>(
      'CORS_HEADERS',
      'Content-Type,Authorization',
    ),
    credentials: configService.get<boolean>('CORS_CREDENTIALS', true),
  });

  await app.listen(port, host);
  Logger.log('Flashcards service started', 'Bootstrap');
}

bootstrap();
