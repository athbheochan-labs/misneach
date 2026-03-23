import { Inject, Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { ulid } from 'ulid';

import { AuthService } from 'src/auth/auth.service';
import { TranslationsService } from 'src/translations/translations.service';

interface StatementEventInput {
  statementId?: string; // optional for new statements
  clientId: string;
  changes: {
    text: string;
    translation?: string;
    pronunciation?: string;
    notes?: string;
  };
  interaction: {
    type: string;
    timestamp: number;
  };
  autoTranslate?: boolean;
}

@Injectable()
export class LexiconService {
  private readonly logger = new Logger(LexiconService.name);
  private readonly nlpUrl = process.env.NLP_SERVICE_URL || 'http://nlp:8300';

  constructor(
    @Inject('REDIS') private readonly redis: Redis,
    private readonly translationsService: TranslationsService,
    private readonly authService: AuthService,
  ) { }

  /**
   * Get a user's lexicon with words and scores
   */
  async getUserLexicon(clientId: string, lang: string) {
    try {
      const priorityKey = `user:${clientId}:priority:${lang}`;

      const flat = await this.redis.zrange(priorityKey, 0, -1, 'WITHSCORES');

      if (!flat.length) return [];

      // Convert flat array to array of { id, score }
      const wordIdsWithScores = [];
      for (let i = 0; i < flat.length; i += 2) {
        wordIdsWithScores.push({
          id: flat[i],
          score: parseFloat(flat[i + 1]),
        });
      }

      const wordIds = wordIdsWithScores.map((item) => item.id);

      // Fetch words from lexicon:words hash
      const pipeline = this.redis.pipeline();
      wordIds.forEach((id) => pipeline.hget('lexicon:words', id));
      const wordResults = await pipeline.exec();

      return wordIdsWithScores.map((item, idx) => ({
        id: item.id,
        score: item.score,
        word: wordResults[idx][1] || null,
      }));
    } catch (err) {
      this.logger.error(`Failed to fetch lexicon for ${clientId}`, err);
      return [];
    }
  }

  async importWords(payload: {
    clientId: string;
    targetLanguage: string;
    words: string[];
    interaction: any;
  }) {
    const enrichedPayload = {
      requestId: crypto.randomUUID(),
      clientId: payload.clientId,
      targetLanguage: payload.targetLanguage,
      words: payload.words,
      interaction: {
        type: payload.interaction.type,
        timestamp: payload.interaction.timestamp
          ? Date.parse(payload.interaction.timestamp)
          : Date.now(),
      },
    };
    const response = await fetch(`${this.nlpUrl}/ingest/lexicon-import`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(enrichedPayload),
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`NLP import failed (${response.status}): ${body || 'empty response'}`);
    }
  }

  async handleStatementEvent(input: StatementEventInput) {
    const user = await this.authService.findUserByClientId(input.clientId);
    const isNew = !input.statementId;

    const requestId = ulid();

    const event = {
      requestId,
      statementId: input.statementId || null,
      clientId: input.clientId,
      changes: input.changes,
      language: user.languageSettings?.[0]?.targetLanguage ?? 'ga',
      interaction: input.interaction,
      type: isNew ? 'statement_created' : 'statement_updated',
      autoTranslate: input.autoTranslate ?? false,
      timestamp: Date.now(),
    };
    const response = await fetch(`${this.nlpUrl}/ingest/statement-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`NLP statement ingest failed (${response.status}): ${body || 'empty response'}`);
    }

    // Optionally trigger translation if requested
    if (input.autoTranslate) {
      await this.translationsService.emitTranslationRequest({
        clientId: input.clientId,
        text: input.changes.text,
        sourceLanguage: user.languageSettings?.[0]?.firstLanguage ?? 'en',
        targetLanguage: user.languageSettings?.[0]?.targetLanguage ?? 'ga',
        statementId: input.statementId || null,
        requestId,
      });
    }
  }
}
