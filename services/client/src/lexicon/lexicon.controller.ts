import {
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from 'src/auth/auth.service';
import { AuthenticatedRequest } from 'src/auth/types/request';
import { LexiconService } from './lexicon.service';

export class UpdateStatementDto {
  text?: string;
  translation?: string;
  pronunciation?: string;
  notes?: string;

  autoTranslate?: boolean;

  interaction?: {
    type: string;
    timestamp?: number;
  };
}

@Controller('')
export class LexiconController {
  private readonly logger = new Logger(LexiconController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly lexiconService: LexiconService,
  ) { }

  private resolveLexiconBaseUrls(): string[] {
    const configured = (process.env.LEXICON_INTERNAL_URL || '').trim();
    const configuredList = (process.env.LEXICON_INTERNAL_URLS || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);

    const candidates = [
      configured,
      ...configuredList,
      'http://lexicon:3010',
      'http://127.0.0.1:3010',
      'http://localhost:3010',
    ].filter(Boolean);

    return [...new Set(candidates)];
  }

  /**
   * Returns snapshot data as JSON.
   */
  @Get('/snapshot/:clientId')
  async getSnapshot(@Param('clientId') clientId: string, @Res() res: Response) {
    const user = await this.authService.findUserByClientId(clientId);
    const targetLanguage = user?.languageSettings?.[0]?.targetLanguage ?? 'ga';
    const baseUrls = this.resolveLexiconBaseUrls();

    try {
      let lastError: Error | null = null;

      for (const baseUrl of baseUrls) {
        const url = `${baseUrl}/snapshot/${clientId}/${targetLanguage}`;
        try {
          const response = await fetch(url);
          if (!response.ok) {
            const bodyText = await response.text().catch(() => '');
            this.logger.warn(
              `Snapshot upstream returned ${response.status} from ${url}${bodyText ? `: ${bodyText}` : ''}`,
            );
            continue;
          }

          const data = await response.json();
          return res.json(data);
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          this.logger.warn(`Snapshot upstream request failed for ${url}: ${lastError.message}`);
        }
      }

      return res.status(502).json({
        error: 'Snapshot service unavailable',
        attempted: baseUrls,
      });
    } catch (err) {
      this.logger.error(`Failed to fetch snapshot ${clientId}`, err);
      return res.status(500).json({ error: 'Failed to fetch snapshot data' });
    }
  }

  @Get('/lexicon/user')
  async getUserLexicon(@Req() req: AuthenticatedRequest) {
    const clientId = await this.authService.getClientIdFromSession(req);
    const user = await this.authService.findUserByClientId(clientId);
    return this.lexiconService.getUserLexicon(
      clientId,
      user?.languageSettings?.[0]?.targetLanguage ?? 'ga',
    );
  }

  @Post('/lexicon/import')
  async importLexicon(
    @Body() body: { words: string[] },
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    const clientId = await this.authService.getClientIdFromSession(req);
    const user = await this.authService.findUserByClientId(clientId);

    if (!body.words?.length) {
      return res.status(400).json({ error: 'No words provided' });
    }

    const interaction = {
      type: 'lexicon_import',
      timestamp: new Date().toISOString(),
    };

    try {
      await this.lexiconService.importWords({
        clientId,
        targetLanguage: user?.languageSettings?.[0]?.targetLanguage ?? 'ga',
        words: body.words,
        interaction,
      });

      return res.status(202).json({ ok: true });
    } catch (err) {
      this.logger.error('Lexicon import failed', err);
      return res.status(500).json({ error: 'Import failed' });
    }
  }
}
