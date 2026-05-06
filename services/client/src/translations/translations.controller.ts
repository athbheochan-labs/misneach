
import { Body, Controller, Get, OnModuleInit, Param, Post, Req, Sse } from '@nestjs/common';

import { AuthService } from 'src/auth/auth.service';
import { AuthenticatedRequest } from 'src/auth/types/request';
import { TranslationDto } from './dtos/translation.dto';
import { TranslationsService } from './translations.service';

@Controller('')
export class TranslationsController implements OnModuleInit {
  constructor(
    private readonly translationsService: TranslationsService,
    private readonly authService: AuthService,
  ) { }

  async onModuleInit() {
    await this.translationsService.initKTableWatchers();
  }

  @Post('/translate')
  async requestTranslation(@Body() dto: TranslationDto) {
    return this.translationsService.submitTranslation(dto);
  }

  @Get('translations/list')
  async list(@Req() req: AuthenticatedRequest) {
    const clientId = await this.authService.getClientIdFromSession(req);
    return this.translationsService.getClientTranslations(clientId);
  }

  @Sse('translations/events/:clientId')
  sse(@Param('clientId') clientId: string) {
    return this.translationsService.getSSEStream(clientId);
  }
}
