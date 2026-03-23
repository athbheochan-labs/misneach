import { BadRequestException, Body, Controller, Get, Logger, Param, Post } from '@nestjs/common';
import {
  Ctx,
  EventPattern,
  KafkaContext,
  Payload,
} from '@nestjs/microservices';
import { CefrAssessmentService } from 'src/cefr/cefr.service';
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
  ) { }

  private normalizeEventPayload(payload: unknown): NlpCompleteEventDto | null {
    let value: unknown = payload;

    // Some producers send { value: ... } envelopes or JSON strings.
    if (typeof value === 'object' && value !== null && 'value' in value) {
      value = (value as { value: unknown }).value;
    }
    if (typeof value === 'string') {
      try {
        value = JSON.parse(value);
      } catch {
        return null;
      }
    }
    if (typeof value === 'object' && value !== null && 'value' in value) {
      const inner = (value as { value: unknown }).value;
      if (typeof inner === 'string') {
        try {
          value = JSON.parse(inner);
        } catch {
          return null;
        }
      }
    }

    if (typeof value !== 'object' || value === null) {
      return null;
    }

    const event = value as Partial<NlpCompleteEventDto>;
    if (
      typeof event.clientId !== 'string' ||
      typeof event.language !== 'string' ||
      !Array.isArray(event.sentences)
    ) {
      return null;
    }

    return event as NlpCompleteEventDto;
  }

  @EventPattern('nlp.complete')
  async handleWordEncounter(
    @Payload() payload: unknown,
    @Ctx() context: KafkaContext,
  ) {
    const event = this.normalizeEventPayload(payload);
    if (!event) {
      this.logger.warn('Skipping invalid nlp.complete payload');
      return;
    }

    try {
      await this.ingestService.ingestFromEvent(event);
      this.logger.debug(`Processed event ${event.requestId ?? '(no-id)'}`);
    } catch (err) {
      this.logger.error(
        `Error processing event ${event.requestId ?? '(no-id)'}: ${err}`,
        err as any,
      );
    }
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
}
