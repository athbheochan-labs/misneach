import { BadRequestException, Body, Controller, Get, Logger, Param, Post } from '@nestjs/common';
import { CefrAssessmentService } from 'src/cefr/cefr.service';
import { TokeniserService } from 'src/common/tokeniser/tokeniser.service';
import { LexiconIngestService } from './ingest/lexicon.ingest.service';
import { NlpCompleteEventDto } from './lexicon.dto';
import { LexiconQueryService } from './query/lexicon.query.service';
import { WordSnapshot } from './query/lexicon.query.types';

@Controller()
export class LexiconController {
  private readonly logger = new Logger(LexiconController.name);

  constructor(
    private readonly ingestService: LexiconIngestService,
    private readonly queryService: LexiconQueryService,
    private readonly cefrService: CefrAssessmentService,
    private readonly tokeniserService: TokeniserService,
  ) { }

  private normalizeEventPayload(payload: unknown): NlpCompleteEventDto | null {
    if (typeof payload !== 'object' || payload === null) {
      return null;
    }

    const event = payload as Partial<NlpCompleteEventDto>;
    if (
      typeof event.clientId !== 'string' ||
      typeof event.language !== 'string' ||
      !Array.isArray(event.sentences)
    ) {
      return null;
    }

    return event as NlpCompleteEventDto;
  }

  @Get('snapshot/:clientId/:language')
  async getSnapshot(
    @Param('clientId') clientId: string,
    @Param('language') language: string,
  ): Promise<{
    snapshot: WordSnapshot[];
    cefr: { level: string; confidence: number };
  }> {
    const [snapshot, assessment] = await Promise.all([
      this.queryService.getUserWordSnapshot(clientId, language),
      this.cefrService.assess(clientId, language),
    ]);

    const cefr = {
      level: assessment.cefr,
      confidence: assessment.confidence,
    };

    return {
      snapshot,
      cefr,
    };
  }

  @Post('ingest/exposure')
  async ingestExposure(
    @Body()
    body: {
      requestId?: string;
      clientId: string;
      language?: string;
      words?: string[];
      interaction?: { type?: string; timestamp?: string | number };
    },
  ) {
    const clientId = String(body?.clientId || '').trim();
    const words = Array.isArray(body?.words)
      ? body.words.map((word) => String(word || '').trim()).filter(Boolean)
      : [];
    const language = String(body?.language || 'ga').trim() || 'ga';

    if (!clientId || words.length === 0) {
      throw new BadRequestException('clientId and words are required');
    }

    await this.ingestService.ingestFromEvent({
      requestId: body.requestId,
      clientId,
      language,
      interaction: {
        type: String(body?.interaction?.type || 'course_lexicon_exposure'),
        timestamp: body?.interaction?.timestamp ?? Date.now(),
      },
      sentences: [
        {
          text: words.join(' '),
          tokens: words.map((word) => ({
            surface: word,
            lemma: word,
            pos: 'unknown',
          })),
        },
      ],
    });

    return { ok: true, ingested: words.length };
  }

  @Post('ingest/nlp-complete')
  async ingestNlpComplete(
    @Body()
    body: {
      requestId?: string;
      statementId?: number | string;
      clientId: string;
      language: string;
      interaction?: { type?: string; timestamp?: string | number };
      sentences?: Array<{
        sentenceId?: string;
        text: string;
        tokens?: Array<{
          surface: string;
          lemma?: string;
          pos?: string;
          morph?: Record<string, unknown>;
        }>;
      }>;
      changes?: {
        text?: string;
        translation?: string;
        pronunciation?: string;
        notes?: string;
      };
    },
  ) {
    const event = this.normalizeEventPayload(body);
    if (!event) {
      throw new BadRequestException('Invalid nlp-complete payload');
    }

    await this.ingestService.ingestFromEvent(event);
    return { ok: true };
  }

  @Post('ingest/statement-event')
  async ingestStatementEvent(
    @Body()
    body: {
      requestId?: string;
      statementId?: number | string | null;
      clientId: string;
      language?: string;
      changes?: {
        text?: string;
        translation?: string;
        pronunciation?: string;
        notes?: string;
      };
      interaction?: { type?: string; timestamp?: string | number };
      type?: 'statement_created' | 'statement_updated';
      autoTranslate?: boolean;
      timestamp?: string | number;
    },
  ) {
    const clientId = String(body?.clientId || '').trim();
    const text = String(body?.changes?.text || '').trim();
    const language = String(body?.language || 'ga').trim() || 'ga';

    if (!clientId || !text) {
      throw new BadRequestException('clientId and changes.text are required');
    }

    const tokenised = await this.tokeniserService.tokenise(text, language);
    const tokens = tokenised.length
      ? tokenised.map((token) => ({
          surface: String(token.token || '').trim(),
          lemma: String(token.lemma || token.token || '').trim(),
          pos: String(token.pos || 'unknown').trim() || 'unknown',
          morph:
            token.meta && typeof token.meta === 'object'
              ? token.meta
              : undefined,
        }))
      : text
          .split(/\s+/)
          .map((value) => value.trim())
          .filter(Boolean)
          .map((surface) => ({
            surface,
            lemma: surface,
            pos: 'unknown',
          }));

    const rawStatementId =
      typeof body?.statementId === 'number'
        ? body.statementId
        : typeof body?.statementId === 'string' && body.statementId.trim()
          ? Number(body.statementId)
          : undefined;
    const statementId =
      rawStatementId != null && Number.isFinite(rawStatementId)
        ? rawStatementId
        : undefined;

    await this.ingestService.ingestFromEvent({
      requestId: body?.requestId,
      statementId,
      clientId,
      language,
      interaction: {
        type: String(body?.interaction?.type || 'statement_updated'),
        timestamp: body?.interaction?.timestamp ?? Date.now(),
      },
      changes: {
        translation: body?.changes?.translation,
        pronunciation: body?.changes?.pronunciation,
        notes: body?.changes?.notes,
      },
      sentences: [
        {
          text,
          tokens,
        },
      ],
    });

    return { ok: true, tokenCount: tokens.length };
  }
}
