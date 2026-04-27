import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PhrasebookController } from './phrasebook.controller';
import { PhrasebookService } from './phrasebook.service';
import {
  Phrase,
  PhraseCategory,
  PhraseGroup,
  PhraseToken,
} from './phrasebook.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Phrase,
      PhraseToken,
      PhraseCategory,
      PhraseGroup,
    ]),
  ],
  controllers: [PhrasebookController],
  providers: [PhrasebookService],
  exports: [],
})
export class PhrasebookModule { }
