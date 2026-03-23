import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PhrasebookController } from './phrasebook.controller';
import { PhrasebookService } from './phrasebook.service';
import { Phrase, PhraseToken } from './phrasebook.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Phrase, PhraseToken])],
  controllers: [PhrasebookController],
  providers: [PhrasebookService],
  exports: [],
})
export class PhrasebookModule { }
