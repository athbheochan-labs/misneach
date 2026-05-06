import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';

import {
  CreateFlashcardDto,
  CreateFlashcardPackWithCardsDto,
  GetDueCardsQueryDto,
  GetFlashcardHealthQueryDto,
  RecordAttemptDto,
} from './flashcards.dto';
import { FlashcardsService } from './flashcards.service';

@Controller()
export class FlashcardsController {
  constructor(private readonly flashcardsService: FlashcardsService) {}

  @Get('packs')
  listPacks(@Query('clientId') clientId: string) {
    return this.flashcardsService.listPacks(clientId);
  }

  @Post('packs')
  createPack(
    @Query('clientId') clientId: string,
    @Body() body: CreateFlashcardPackWithCardsDto,
  ) {
    return this.flashcardsService.createPackWithCards(clientId, body);
  }

  @Get('packs/:packId')
  getPack(
    @Query('clientId') clientId: string,
    @Param('packId', ParseIntPipe) packId: number,
  ) {
    return this.flashcardsService.getPack(clientId, packId);
  }

  @Post('packs/:packId/cards')
  createCard(
    @Query('clientId') clientId: string,
    @Param('packId', ParseIntPipe) packId: number,
    @Body() body: CreateFlashcardDto,
  ) {
    return this.flashcardsService.createCard(clientId, packId, body);
  }

  @Get('study/due')
  getDueCards(
    @Query('clientId') clientId: string,
    @Query() query: GetDueCardsQueryDto,
  ) {
    return this.flashcardsService.getDueCards(clientId, query);
  }

  @Get('health')
  getHealth(
    @Query('clientId') clientId: string,
    @Query() query: GetFlashcardHealthQueryDto,
  ) {
    return this.flashcardsService.getHealth(clientId, query);
  }

  @Post('cards/:cardId/attempt')
  recordAttempt(
    @Query('clientId') clientId: string,
    @Param('cardId', ParseIntPipe) cardId: number,
    @Body() body: RecordAttemptDto,
  ) {
    return this.flashcardsService.recordAttempt(clientId, cardId, body);
  }
}
