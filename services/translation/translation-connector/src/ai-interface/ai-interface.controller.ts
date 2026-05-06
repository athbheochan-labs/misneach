import { Body, Controller, Get, Logger, Param, Post } from '@nestjs/common';
import { AiInterfaceService } from './ai-interface.service';
import { TranslationDto } from './dto/translation.dto';

@Controller()
export class AiInterfaceController {
  private readonly logger = new Logger(AiInterfaceController.name);

  constructor(private readonly service: AiInterfaceService) {}

  @Get('translations/:clientId')
  async getTranslationsForClient(@Param('clientId') clientId: string) {
    this.logger.log(`Fetching translations for client: ${clientId}`);
    try {
      const translations = await this.service.getTranslations(clientId);
      return {
        success: true,
        data: translations,
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch translations for client ${clientId}:`,
        error?.stack,
      );
      return {
        success: false,
        message: 'Failed to fetch translations',
      };
    }
  }

  @Post('translations')
  async translateViaHttp(@Body() dto: TranslationDto) {
    return this.service.translateViaHttp(dto);
  }
}
