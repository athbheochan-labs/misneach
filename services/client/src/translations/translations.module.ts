import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { AuthModule } from 'src/auth/auth.module';
import { TranslationsController } from './translations.controller';
import { TranslationsService } from './translations.service';

@Module({
  controllers: [TranslationsController],
  providers: [TranslationsService],
  imports: [AuthModule, HttpModule],
  exports: [TranslationsService],
})
export class TranslationsModule { }
