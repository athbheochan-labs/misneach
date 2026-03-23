import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';

import { AuthService } from 'src/auth/auth.service';
import { AuthenticatedRequest } from 'src/auth/types/request';

import { FlashcardsService } from './flashcards.service';

@Controller('flashcards')
export class FlashcardsController {
  constructor(
    private readonly authService: AuthService,
    private readonly flashcardsService: FlashcardsService,
  ) {}

  @Get('decks')
  async getDecks(@Req() req: AuthenticatedRequest) {
    const clientId = await this.authService.getClientIdFromSession(req);
    return this.flashcardsService.getDecks(clientId);
  }

  @Get('decks/:packId')
  async getDeck(
    @Req() req: AuthenticatedRequest,
    @Param('packId', ParseIntPipe) packId: number,
  ) {
    const clientId = await this.authService.getClientIdFromSession(req);
    return this.flashcardsService.getDeck(clientId, packId);
  }

  @Post('decks')
  async createDeck(@Req() req: AuthenticatedRequest, @Body() body: any) {
    const clientId = await this.authService.getClientIdFromSession(req);
    return this.flashcardsService.createDeck(clientId, body);
  }

  @Post('decks/:packId/cards')
  async createCard(
    @Req() req: AuthenticatedRequest,
    @Param('packId', ParseIntPipe) packId: number,
    @Body() body: any,
  ) {
    const clientId = await this.authService.getClientIdFromSession(req);
    return this.flashcardsService.createCard(clientId, packId, body);
  }

  @Get('study/due')
  async getDueCards(
    @Req() req: AuthenticatedRequest,
    @Query('packId') packId?: string,
    @Query('limit') limit?: string,
  ) {
    const clientId = await this.authService.getClientIdFromSession(req);

    return this.flashcardsService.getDueCards(
      clientId,
      packId ? Number(packId) : undefined,
      limit ? Number(limit) : 20,
    );
  }

  @Get('health')
  async getHealth(
    @Req() req: AuthenticatedRequest,
    @Query('limit') limit?: string,
    @Query('lookbackDays') lookbackDays?: string,
  ) {
    const clientId = await this.authService.getClientIdFromSession(req);
    return this.flashcardsService.getHealth(
      clientId,
      limit ? Number(limit) : 5,
      lookbackDays ? Number(lookbackDays) : 30,
    );
  }

  @Post('cards/:cardId/attempt')
  async recordAttempt(
    @Req() req: AuthenticatedRequest,
    @Param('cardId', ParseIntPipe) cardId: number,
    @Body() body: { grade: 'again' | 'hard' | 'good' | 'easy'; responseMs?: number },
  ) {
    const clientId = await this.authService.getClientIdFromSession(req);
    return this.flashcardsService.recordAttempt(clientId, cardId, body);
  }
}
