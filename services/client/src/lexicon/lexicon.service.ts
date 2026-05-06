import { Injectable, Logger } from '@nestjs/common';
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
    private readonly translationsService: TranslationsService,
    private readonly authService: AuthService,
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
   * Get a user's lexicon with words and scores
   */
  async getUserLexicon(clientId: string, lang: string) {
    try {
      const baseUrls = this.resolveLexiconBaseUrls();
      let lastError: Error | null = null;

      for (const baseUrl of baseUrls) {
        const url = `${baseUrl}/snapshot/${clientId}/${lang}`;

        try {
          const response = await fetch(url);
          if (!response.ok) {
            const bodyText = await response.text().catch(() => '');
            this.logger.warn(
              `User lexicon upstream returned ${response.status} from ${url}${bodyText ? `: ${bodyText}` : ''}`,
            );
            continue;
          }

          const data = await response.json() as {
            snapshot?: Array<{
              id: number;
              word: string;
              stats?: { score?: number };
            }>;
          };

          const snapshot = Array.isArray(data.snapshot) ? data.snapshot : [];
          return snapshot.map((item) => ({
            id: item.id,
            score: Number(item.stats?.score ?? 0),
            word: item.word ?? null,
          }));
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          this.logger.warn(`User lexicon upstream request failed for ${url}: ${lastError.message}`);
        }
      }

      if (lastError) {
        this.logger.error(`Failed to fetch user lexicon for ${clientId}`, lastError);
      }

      return [];
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
