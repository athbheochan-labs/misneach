import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SaveTranslationResult } from './dto/save-translation-result.dto';
import { SaveTranslationDto } from './dto/save-translation.dto';
import { TranslationDto } from './dto/translation.dto';
import { Translation } from './translation.entity';

@Injectable()
export class AiInterfaceService {
  constructor(
    @InjectRepository(Translation)
    private readonly translationRepository: Repository<Translation>,
  ) {}

  async saveTranslation(
    data: SaveTranslationDto,
  ): Promise<SaveTranslationResult> {
    const translation = this.translationRepository.create({
      clientId: data.clientId,
      originalText: data.originalText,
      targetLanguage: data.targetLanguage,
      translated: data.translated,
    });

    const savedTranslation = await this.translationRepository.save(translation);

    return {
      id: savedTranslation.id,
      clientId: savedTranslation.clientId,
      originalText: savedTranslation.originalText,
      targetLanguage: savedTranslation.targetLanguage,
      translated: savedTranslation.translated,
      createdAt: savedTranslation.createdAt,
    };
  }

  private normalizeLang(lang: string): string {
    return String(lang || '')
      .trim()
      .toUpperCase();
  }

  private async translateWithDeepL(
    text: string,
    sourceLanguage: string,
    targetLanguage: string,
  ): Promise<string> {
    const apiKey = process.env.DEEPL_API_KEY;
    if (!apiKey) {
      throw new Error('DEEPL_API_KEY is not configured');
    }

    const deeplUrl =
      process.env.DEEPL_API_URL || 'https://api-free.deepl.com/v2/translate';

    const body = new URLSearchParams({
      auth_key: apiKey,
      text,
      source_lang: this.normalizeLang(sourceLanguage),
      target_lang: this.normalizeLang(targetLanguage),
    });

    const response = await fetch(deeplUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'DeepL request failed');
    }

    const payload = (await response.json()) as {
      translations?: Array<{ text?: string }>;
    };

    const translated = String(payload?.translations?.[0]?.text || '').trim();
    if (!translated) {
      throw new Error('DeepL returned an empty translation');
    }

    return translated;
  }

  async translateViaHttp(dto: TranslationDto) {
    const translated = await this.translateWithDeepL(
      dto.text,
      dto.sourceLanguage,
      dto.targetLanguage,
    );

    const saved = await this.saveTranslation({
      requestId: dto.requestId,
      clientId: dto.clientId,
      targetLanguage: dto.targetLanguage,
      originalText: dto.text,
      translated,
    });

    await this.postNlpTranslationComplete({
      requestId: dto.requestId,
      clientId: dto.clientId,
      sourceLanguage: dto.sourceLanguage,
      targetLanguage: dto.targetLanguage,
      originalText: dto.text,
      translated,
      interaction: dto.interaction,
    });

    return {
      ...saved,
      requestId: dto.requestId,
      sourceLanguage: dto.sourceLanguage,
      targetLanguage: dto.targetLanguage,
    };
  }

  async getTranslations(clientId: string) {
    return this.translationRepository.find({
      where: { clientId },
      order: { createdAt: 'DESC' },
    });
  }

  private async postNlpTranslationComplete(payload: {
    requestId?: string;
    clientId: string;
    sourceLanguage: string;
    targetLanguage: string;
    originalText: string;
    translated: string;
    interaction?: { type: string; timestamp: number };
  }) {
    const nlpUrl = process.env.NLP_URL || 'http://nlp:8300';
    const response = await fetch(`${nlpUrl}/ingest/translation-complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requestId: payload.requestId || `${Date.now()}`,
        clientId: payload.clientId,
        sourceLanguage: payload.sourceLanguage,
        targetLanguage: payload.targetLanguage,
        originalText: payload.originalText,
        translated: payload.translated,
        interaction: payload.interaction ?? {
          type: 'translate_text',
          timestamp: Date.now(),
        },
      }),
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || 'Failed to post translation payload to NLP');
    }
  }
}
