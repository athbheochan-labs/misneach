import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash, randomUUID } from 'crypto';

import { UpdatePhraseDto, PhrasebookStatementDto } from './phrasebook.dto';
import { Phrase } from './phrasebook.entity';
import { PhraseToken } from './phrasebook.entity';

@Injectable()
export class PhrasebookService {
  constructor(
    @InjectRepository(Phrase)
    private readonly phraseRepo: Repository<Phrase>,
    @InjectRepository(PhraseToken)
    private readonly tokenRepo: Repository<PhraseToken>,
  ) {}

  private readonly logger = new Logger(PhrasebookService.name);
  private readonly translatorUrl =
    process.env.TRANSLATOR_URL || 'http://translator:3009';

  private normalizePhraseText(text: string | undefined | null) {
    return String(text || '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private normalizeSource(
    source: string | undefined | null,
    fallback: 'manual' | 'course' = 'manual',
  ): 'manual' | 'course' {
    const normalized = String(source || '')
      .trim()
      .toLowerCase();

    if (!normalized) return fallback;

    if (
      normalized === 'manual' ||
      normalized === 'own' ||
      normalized === 'user' ||
      normalized === 'user_added' ||
      normalized === 'custom' ||
      normalized === 'personal' ||
      normalized === 'direct_input' ||
      normalized === 'manual_input'
    ) {
      return 'manual';
    }

    if (
      normalized === 'course' ||
      normalized === 'nlp' ||
      normalized === 'lesson' ||
      normalized === 'course_phrase' ||
      normalized === 'lexicon' ||
      normalized === 'import'
    ) {
      return 'course';
    }

    return fallback;
  }

  // Fingerprint must be scoped by client to avoid cross-user collisions.
  private phraseFingerprint(clientId: string, normalizedText: string) {
    return createHash('sha256')
      .update(`${clientId}:${normalizedText.toLowerCase()}`)
      .digest('hex');
  }

  private isDuplicateEntryError(error: unknown) {
    const candidate = error as
      | { code?: string; driverError?: { code?: string } }
      | undefined;
    return (
      candidate?.code === 'ER_DUP_ENTRY' ||
      candidate?.driverError?.code === 'ER_DUP_ENTRY'
    );
  }

  private async findExistingPhraseForClientText(
    clientId: string,
    normalizedText: string,
  ) {
    const normalized = normalizedText.toLowerCase();
    return this.phraseRepo
      .createQueryBuilder('phrase')
      .where('phrase.clientId = :clientId', { clientId })
      .andWhere('LOWER(TRIM(phrase.text)) = :normalized', { normalized })
      .orderBy('phrase.id', 'ASC')
      .getOne();
  }

  private async emitPhrasebookEvent(event: {
    type: string;
    requestId?: string;
    clientId: string;
    phraseId?: number;
    phrase?: PhrasebookStatementDto;
    status?: 'accepted' | 'completed' | 'failed';
    error?: string;
  }) {
    this.logger.debug(
      `phrasebook event=${event.type} clientId=${event.clientId} phraseId=${event.phraseId ?? 'n/a'}`,
    );
  }

  private async requestTranslation(params: {
    clientId: string;
    text: string;
    sourceLanguage: string;
    targetLanguage: string;
    statementId: number;
    requestId?: string;
  }): Promise<{ translated?: string; targetLanguage?: string }> {
    const requestId = params.requestId ?? randomUUID();

    const response = await fetch(`${this.translatorUrl}/translations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestId,
        clientId: params.clientId,
        text: params.text,
        sourceLanguage: params.sourceLanguage,
        targetLanguage: params.targetLanguage,
        statementId: params.statementId,
        interaction: {
          type: 'phrasebook.auto-translation',
          timestamp: Date.now(),
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || 'Phrase translation request failed');
    }

    return response.json();
  }

  async getPhrasebook(clientId: string): Promise<PhrasebookStatementDto[]> {
    const phrases = await this.phraseRepo.find({
      where: { clientId },
      relations: ['tokens'],
      order: { tokens: { position: 'ASC' } },
    });

    return phrases.map((p) => this.toDto(p));
  }

  async getPhrase(id: number): Promise<PhrasebookStatementDto> {
    const phrase = await this.phraseRepo.findOne({
      where: { id },
      relations: ['tokens'],
      order: { tokens: { position: 'ASC' } },
    });

    if (!phrase) throw new NotFoundException(`Phrase ${id} not found`);
    return this.toDto(phrase);
  }

  async createPhrase(
    clientId: string,
    dto: UpdatePhraseDto,
    requestId?: string,
  ): Promise<PhrasebookStatementDto> {
    const normalizedText = this.normalizePhraseText(dto.text);
    if (!normalizedText) {
      throw new BadRequestException('Phrase text is required');
    }

    // Idempotency: if this client already has this phrase text, return it.
    const existing = await this.findExistingPhraseForClientText(
      clientId,
      normalizedText,
    );
    if (existing) {
      return this.getPhrase(existing.id);
    }

    const fingerprint = this.phraseFingerprint(clientId, normalizedText);

    const phraseEntity = this.phraseRepo.create({
      clientId,
      fingerprint,
      createdAt: new Date(),
      ...dto,
      text: normalizedText,
      source: this.normalizeSource(dto.source, 'manual'),
      inPractice: Boolean(dto.inPractice),
      inFlashcards: Boolean(dto.inFlashcards),
    });

    let saved: Phrase;
    try {
      saved = await this.phraseRepo.save(phraseEntity);
    } catch (error) {
      if (!this.isDuplicateEntryError(error)) {
        throw error;
      }

      // Handle replay/race duplicates by returning existing phrase instead of failing the consumer.
      const duplicate =
        (await this.phraseRepo.findOne({ where: { fingerprint } })) ||
        (await this.findExistingPhraseForClientText(clientId, normalizedText));

      if (duplicate) {
        return this.getPhrase(duplicate.id);
      }

      throw error;
    }

    if (dto.tokens?.length) {
      const tokens = dto.tokens.map((t) =>
        this.tokenRepo.create({
          ...t,
          word: t.lemma ?? t.surface,
          phrase: saved,
        }),
      );
      await this.tokenRepo.save(tokens);
    }

    await this.emitStatementEvent('statement_created', saved, dto);

    if (dto.autoTranslation && !saved.translation) {
      try {
        const translation = await this.requestTranslation({
          requestId: requestId ?? randomUUID(),
          clientId: saved.clientId || clientId,
          text: saved.text,
          sourceLanguage: saved.language,
          targetLanguage: 'en',
          statementId: saved.id,
        });
        saved.translation = translation?.translated ?? saved.translation;
        saved.translationLanguage =
          translation?.targetLanguage ?? saved.translationLanguage;
        await this.phraseRepo.save(saved);
      } catch (error) {
        this.logger.warn(
          `Auto translation failed for phrase ${saved.id}: ${String(error)}`,
        );
      }
    }

    const phraseDto = await this.getPhrase(saved.id);
    await this.emitPhrasebookEvent({
      type: 'phrase.created',
      requestId,
      clientId,
      phraseId: saved.id,
      phrase: phraseDto,
      status: 'completed',
    });
    return phraseDto;
  }

  async updatePhrase(
    id: number,
    dto: UpdatePhraseDto,
    requestId?: string,
  ): Promise<PhrasebookStatementDto> {
    const phrase = await this.phraseRepo.findOne({
      where: { id },
      relations: ['tokens'],
    });
    if (!phrase) throw new NotFoundException(`Phrase ${id} not found`);

    Object.assign(phrase, dto);
    if (typeof dto.source === 'string') {
      phrase.source = this.normalizeSource(dto.source, 'manual');
    }
    await this.phraseRepo.save(phrase);

    await this.emitStatementEvent('statement_updated', phrase, dto);

    if (dto.tokens) {
      // Delete old tokens
      await this.tokenRepo.delete({ phrase: { id } });
      // Save new tokens
      const tokens = dto.tokens.map((t) =>
        this.tokenRepo.create({
          ...t,
          word: t.lemma ?? t.surface,
          phrase,
        }),
      );
      await this.tokenRepo.save(tokens);
    }

    const updated = await this.getPhrase(id);
    await this.emitPhrasebookEvent({
      type: 'phrase.updated',
      requestId,
      clientId: phrase.clientId,
      phraseId: id,
      phrase: updated,
      status: 'completed',
    });
    return updated;
  }

  async deletePhrase(
    id: number,
    requestId?: string,
  ): Promise<{ success: boolean }> {
    const phrase = await this.phraseRepo.findOne({ where: { id } });
    const res = await this.phraseRepo.delete(id);
    if (res.affected && phrase) {
      await this.emitPhrasebookEvent({
        type: 'phrase.deleted',
        requestId,
        clientId: phrase.clientId,
        phraseId: id,
        status: 'completed',
      });
    }
    return { success: res.affected > 0 };
  }

  async generateTranslation(
    id: number,
    clientId: string,
    requestId?: string,
  ): Promise<PhrasebookStatementDto> {
    const where = clientId ? { id, clientId } : { id };
    const phrase = await this.phraseRepo.findOne({ where });
    if (!phrase) throw new NotFoundException(`Phrase ${id} not found`);

    const translationRequestId = requestId ?? randomUUID();
    phrase.requestId = translationRequestId;
    await this.phraseRepo.save(phrase);

    const effectiveClientId = clientId || phrase.clientId;

    await this.emitPhrasebookEvent({
      type: 'phrase.translation.requested',
      requestId: translationRequestId,
      clientId: phrase.clientId,
      phraseId: phrase.id,
      status: 'accepted',
    });

    try {
      const translation = await this.requestTranslation({
        requestId: translationRequestId,
        clientId: effectiveClientId,
        text: phrase.text,
        sourceLanguage: phrase.language,
        targetLanguage: 'en',
        statementId: phrase.id,
      });

      phrase.translation = translation?.translated ?? phrase.translation;
      phrase.translationLanguage =
        translation?.targetLanguage ?? phrase.translationLanguage;
      await this.phraseRepo.save(phrase);
    } catch (error) {
      await this.emitPhrasebookEvent({
        type: 'phrase.translation.failed',
        requestId: translationRequestId,
        clientId: phrase.clientId,
        phraseId: phrase.id,
        status: 'failed',
        error: String(error),
      });
      throw error;
    }

    await this.emitPhrasebookEvent({
      type: 'phrase.translated',
      requestId: translationRequestId,
      clientId: phrase.clientId,
      phraseId: phrase.id,
      phrase: await this.getPhrase(phrase.id),
      status: 'completed',
    });

    return this.getPhrase(id);
  }

  private async emitStatementEvent(
    type: 'statement_created' | 'statement_updated',
    phrase: Phrase,
    _dto: UpdatePhraseDto,
  ) {
    const requestId = phrase.requestId ?? randomUUID();
    phrase.requestId = requestId;
    await this.phraseRepo.save(phrase);

    this.logger.debug(
      `statement event skipped type=${type} phraseId=${phrase.id} clientId=${phrase.clientId}`,
    );
  }

  private toDto(p: Phrase): PhrasebookStatementDto {
    return {
      id: p.id,
      text: p.text,
      source: this.normalizeSource(p.source, 'course'),
      translation: p.translation,
      pronunciation: p.pronunciation,
      example: p.example,
      notes: p.notes,
      inPractice: Boolean(p.inPractice),
      inFlashcards: Boolean(p.inFlashcards),
      tokens: p.tokens?.map((t) => ({
        position: t.position,
        surface: t.surface,
        lemma: t.lemma,
        pos: t.pos,
      })),
    };
  }
}
