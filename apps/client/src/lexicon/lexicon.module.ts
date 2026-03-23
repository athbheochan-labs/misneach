import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { TranslationsModule } from 'src/translations/translations.module';
import { RedisModule } from 'src/utils/redis/redis.module';
import { LexiconController } from './lexicon.controller';
import { LexiconService } from './lexicon.service';

@Module({
  imports: [AuthModule, RedisModule, TranslationsModule],
  controllers: [LexiconController],
  providers: [LexiconService],
  exports: [LexiconService],
})
export class LexiconModule { }
