import { Injectable, Logger } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { ulid } from 'ulid';

import { AuthService } from 'src/auth/auth.service';
import { TranslationDto } from './dtos/translation.dto';

export interface InteractionEvent<T> {
  requestId: string;
  clientId: string;
  sourceLanguage: string;
  targetLanguage: string;
  interactions: Interaction[];
  payload: T;
}

export interface Interaction {
  type: string;
  timestamp: number;
}

@Injectable()
export class TranslationsService {
  private readonly logger = new Logger(TranslationsService.name);
  private readonly joinCache = new Map<string, any>();
  private readonly sseStreams = new Map<string, Subject<MessageEvent>>();

  constructor(private readonly authService: AuthService) {}

  async initKTableWatchers() {
    // Kafka KTable path removed for translations.
  }

  async submitTranslation(dto: TranslationDto) {
    const requestId = dto.requestId ?? ulid();
    const response = await this.emitTranslationRequest({ ...dto, requestId });
    return {
      status: 'ok',
      requestId,
      translation: response,
    };
  }

  async getClientTranslations(clientId: string) {
    const response = await fetch(`http://translator:3009/translations/${clientId}`);
    return response.json();
  }

  getSSEStream(clientId: string): Observable<MessageEvent> {
    this.logger.log(`SSE connection opened for clientId=${clientId}`);
    return this.getClientStream(clientId).asObservable();
  }

  private getClientStream(clientId: string): Subject<MessageEvent> {
    const existing = this.sseStreams.get(clientId);
    if (existing) return existing;

    const stream = new Subject<MessageEvent>();
    this.sseStreams.set(clientId, stream);
    return stream;
  }

  private publishClientEvent(clientId: string, payload: any) {
    const stream = this.getClientStream(clientId);
    stream.next({ data: payload } as any);
  }

  private mergeAndPublish(requestId: string, payload: any) {
    const existing = this.joinCache.get(requestId) || {};
    const merged = { ...existing, ...payload };
    this.joinCache.set(requestId, merged);

    const ownerClientId = merged?.translation?.clientId;
    if (ownerClientId) {
      this.publishClientEvent(ownerClientId, merged);
    }
  }

  async emitTranslationRequest(dto: TranslationDto): Promise<any> {
    const user = await this.authService.findUserByClientId(dto.clientId);
    const sourceLanguage = user?.languageSettings?.[0]?.targetLanguage ?? 'ga';
    const targetLanguage = user?.languageSettings?.[0]?.firstLanguage ?? 'en';
    const requestId = dto.requestId ?? ulid();

    this.mergeAndPublish(requestId, {
      translation: {
        id: requestId,
        requestId,
        clientId: dto.clientId,
        sourceLanguage,
        targetLanguage,
        originalText: dto.text,
        translated: '',
        createdAt: new Date().toISOString(),
      },
    });

    const translatorUrl = process.env.TRANSLATOR_URL || 'http://translator:3009';
    const response = await fetch(`${translatorUrl}/translations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestId,
        clientId: dto.clientId,
        sourceLanguage,
        targetLanguage,
        text: dto.text,
        interaction: {
          type: 'translate_text',
          timestamp: Date.now(),
        },
        statementId: dto.statementId ? Number(dto.statementId) : undefined,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Translation request failed');
    }

    const translation = await response.json();

    this.mergeAndPublish(requestId, {
      translation: {
        ...translation,
        requestId,
      },
    });

    this.logger.log(
      `Submitted translation request via REST for clientId=${dto.clientId}`,
    );

    return translation;
  }
}
