import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { TranslationsModule } from 'src/translations/translations.module';
import { LexiconController } from './lexicon.controller';
import { LexiconService } from './lexicon.service';

@Module({
  imports: [AuthModule, TranslationsModule],
  controllers: [LexiconController],
  providers: [LexiconService],
  exports: [LexiconService],
})
export class LexiconModule { }
