import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import {
  Flashcard,
  FlashcardAttempt,
  FlashcardPack,
} from './flashcards.entity';
import { FlashcardsController } from './flashcards.controller';
import { FlashcardsService } from './flashcards.service';

@Module({
  imports: [TypeOrmModule.forFeature([FlashcardPack, Flashcard, FlashcardAttempt])],
  controllers: [FlashcardsController],
  providers: [FlashcardsService],
})
export class FlashcardsModule {}
