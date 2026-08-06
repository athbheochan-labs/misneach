import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { createHash, randomUUID } from 'crypto';

import {
  PhraseCategoryDto,
  PhraseGroupDto,
  PhrasebookPageDto,
  PhrasebookPracticePhraseDto,
  PhrasebookSummaryDto,
  PhrasebookStatementDto,
  UpdatePhraseDto,
} from './phrasebook.dto';
import { Phrase, PhraseCategory, PhraseGroup, PhraseToken } from './phrasebook.entity';

@Injectable()
export class PhrasebookService {
  private readonly ownSources = [
    'manual',
    'own',
    'user',
    'user_added',
    'custom',
    'personal',
    'direct_input',
    'manual_input',
  ];

  constructor(
    @InjectRepository(Phrase)
    private readonly phraseRepo: Repository<Phrase>,
    @InjectRepository(PhraseToken)
    private readonly tokenRepo: Repository<PhraseToken>,
    @InjectRepository(PhraseCategory)
    private readonly categoryRepo: Repository<PhraseCategory>,
    @InjectRepository(PhraseGroup)
    private readonly groupRepo: Repository<PhraseGroup>,
  ) {}

  private readonly logger = new Logger(PhrasebookService.name);
  private readonly translatorUrl =
    process.env.TRANSLATOR_URL || 'http://translator:3009';

  private normalizePhraseText(text: string | undefined | null) {
    return String(text || '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private normalizeOptionalText(
    value: string | undefined | null,
    maxLength?: number,
  ): string | null {
    const normalized = String(value || '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!normalized) return null;
    return typeof maxLength === 'number'
      ? normalized.slice(0, maxLength)
      : normalized;
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

  private async ensureCategory(
    clientId: string,
    name: string | undefined | null,
  ): Promise<PhraseCategory | null> {
    const normalized = this.normalizeOptionalText(name, 100);
    if (!normalized) return null;
    let category = await this.categoryRepo.findOne({
      where: { clientId, name: normalized },
    });
    if (category) {
      if (category.archivedAt) {
        category.archivedAt = null;
        category = await this.categoryRepo.save(category);
      }
      return category;
    }
    return this.categoryRepo.save(
      this.categoryRepo.create({
        clientId,
        name: normalized,
        createdAt: new Date(),
        archivedAt: null,
      }),
    );
  }

  private async ensureGroup(
    clientId: string,
    category: PhraseCategory | null,
    name: string | undefined | null,
  ): Promise<PhraseGroup | null> {
    const normalized = this.normalizeOptionalText(name, 150);
    if (!normalized || !category) return null;
    let group = await this.groupRepo.findOne({
      where: { clientId, categoryId: category.id, name: normalized },
      relations: ['category'],
    });
    if (group) {
      if (group.archivedAt) {
        group.archivedAt = null;
        group = await this.groupRepo.save(group);
      }
      return group;
    }
    return this.groupRepo.save(
      this.groupRepo.create({
        clientId,
        categoryId: category.id,
        name: normalized,
        createdAt: new Date(),
        archivedAt: null,
      }),
    );
  }

  private async resolveOrganization(
    clientId: string,
    dto: UpdatePhraseDto,
  ): Promise<{ category: PhraseCategory | null; group: PhraseGroup | null }> {
    let category: PhraseCategory | null = null;
    let group: PhraseGroup | null = null;

    if (typeof dto.categoryId === 'number') {
      category =
        (await this.categoryRepo.findOne({
          where: { id: dto.categoryId, clientId },
        })) ?? null;
    }

    if (!category && dto.category !== undefined) {
      category = await this.ensureCategory(clientId, dto.category);
    }

    if (typeof dto.groupId === 'number') {
      group =
        (await this.groupRepo.findOne({
          where: { id: dto.groupId, clientId },
          relations: ['category'],
        })) ?? null;
      if (group?.category) category = group.category;
    }

    if (!group && dto.groupName !== undefined) {
      group = await this.ensureGroup(clientId, category, dto.groupName);
    }

    return { category, group };
  }

  private async persistOrganizationLinks(
    phraseId: number,
    organization: { category: PhraseCategory | null; group: PhraseGroup | null },
  ): Promise<void> {
    await this.phraseRepo
      .createQueryBuilder()
      .update(Phrase)
      .set({
        categoryId: organization.category?.id ?? null,
        groupId: organization.group?.id ?? null,
      })
      .where('id = :id', { id: phraseId })
      .execute();
  }

  async getPhrasebook(
    clientId: string,
    filters?: {
      search?: string;
      filter?: string;
      categoryId?: number;
      groupId?: number;
      sort?: string;
      page?: number;
      pageSize?: number;
    },
  ): Promise<PhrasebookPageDto> {
    const pageSize = Math.min(Math.max(filters?.pageSize ?? 24, 1), 100);
    const requestedPage = Math.max(filters?.page ?? 1, 1);
    const sort = this.normalizePhraseSort(filters?.sort);
    const baseQb = this.buildPhrasebookQuery(clientId, filters);
    const total = await baseQb.clone().getCount();
    const totalPages = total > 0 ? Math.ceil(total / pageSize) : 1;
    const page = Math.min(requestedPage, totalPages);
    const offset = (page - 1) * pageSize;

    const idRows = await this.applyPhraseSort(baseQb.clone(), sort)
      .select('phrase.id', 'id')
      .offset(offset)
      .limit(pageSize)
      .getRawMany<{ id: number }>();

    const ids = idRows
      .map((row) => Number(row.id))
      .filter((value) => Number.isFinite(value));

    let phrases: Phrase[] = [];
    if (ids.length) {
      phrases = await this.phraseRepo
        .createQueryBuilder('phrase')
        .leftJoinAndSelect('phrase.tokens', 'token')
        .leftJoinAndSelect('phrase.category', 'category')
        .leftJoinAndSelect('phrase.group', 'group')
        .where('phrase.id IN (:...ids)', { ids })
        .orderBy('token.position', 'ASC')
        .getMany();

      const order = new Map(ids.map((id, index) => [id, index]));
      phrases.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
    }

    return {
      items: phrases.map((phrase) => this.toDto(phrase)),
      page,
      pageSize,
      total,
      totalPages,
      summary: await this.getPhrasebookSummary(clientId, filters),
    };
  }

  async getPracticePhrases(
    clientId: string,
  ): Promise<PhrasebookPracticePhraseDto[]> {
    const phrases = await this.phraseRepo
      .createQueryBuilder('phrase')
      .leftJoinAndSelect('phrase.tokens', 'token')
      .where('phrase.clientId = :clientId', { clientId })
      .andWhere('phrase.inPractice = 1')
      .orderBy('phrase.id', 'DESC')
      .addOrderBy('token.position', 'ASC')
      .getMany();

    return phrases.map((phrase) => ({
      id: phrase.id,
      text: phrase.text,
      translation: phrase.translation,
      notes: phrase.notes,
      tokens: phrase.tokens?.map((token) => ({
        position: token.position,
        surface: token.surface,
        lemma: token.lemma,
        pos: token.pos,
      })),
    }));
  }

  private buildPhrasebookQuery(
    clientId: string,
    filters?: {
      search?: string;
      filter?: string;
      categoryId?: number;
      groupId?: number;
    },
  ) {
    const qb = this.phraseRepo
      .createQueryBuilder('phrase')
      .where('phrase.clientId = :clientId', { clientId });

    if (filters?.categoryId) {
      qb.andWhere('phrase.categoryId = :categoryId', {
        categoryId: filters.categoryId,
      });
    }

    if (filters?.groupId) {
      qb.andWhere('phrase.groupId = :groupId', { groupId: filters.groupId });
    }

    const search = this.normalizeOptionalText(filters?.search, 200);
    if (search) {
      qb.andWhere(
        `(
          LOWER(phrase.text) LIKE :search
          OR LOWER(COALESCE(phrase.translation, '')) LIKE :search
          OR LOWER(COALESCE(phrase.notes, '')) LIKE :search
        )`,
        { search: `%${search.toLowerCase()}%` },
      );
    }

    const filter = String(filters?.filter || 'all').trim().toLowerCase();
    if (filter === 'own') {
      qb.andWhere('LOWER(phrase.source) IN (:...ownSources)', {
        ownSources: this.ownSources,
      });
    } else if (filter === 'course') {
      qb.andWhere('LOWER(phrase.source) = :courseSource', { courseSource: 'course' });
    } else if (filter === 'unannotated') {
      qb.andWhere(
        `COALESCE(NULLIF(TRIM(phrase.pronunciation), ''), NULL) IS NULL
         AND COALESCE(NULLIF(TRIM(phrase.notes), ''), NULL) IS NULL`,
      );
    }

    return qb;
  }

  private normalizePhraseSort(
    value?: string,
  ): 'newest' | 'oldest' | 'alphabetical' {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'oldest') return 'oldest';
    if (normalized === 'alphabetical') return 'alphabetical';
    return 'newest';
  }

  private applyPhraseSort(
    qb: SelectQueryBuilder<Phrase>,
    sort: 'newest' | 'oldest' | 'alphabetical',
  ) {
    if (sort === 'oldest') {
      return qb.orderBy('phrase.id', 'ASC');
    }
    if (sort === 'alphabetical') {
      return qb.orderBy('phrase.text', 'ASC').addOrderBy('phrase.id', 'DESC');
    }
    return qb.orderBy('phrase.id', 'DESC');
  }

  private async getPhrasebookSummary(
    clientId: string,
    filters?: {
      search?: string;
      filter?: string;
      categoryId?: number;
      groupId?: number;
    },
  ): Promise<PhrasebookSummaryDto> {
    const row = await this.buildPhrasebookQuery(clientId, filters)
      .select('COUNT(*)', 'total')
      .addSelect(
        'SUM(CASE WHEN phrase.inPractice = 1 THEN 1 ELSE 0 END)',
        'inPractice',
      )
      .addSelect(
        'SUM(CASE WHEN phrase.inFlashcards = 1 THEN 1 ELSE 0 END)',
        'inFlashcards',
      )
      .addSelect(
        'SUM(CASE WHEN LOWER(phrase.source) IN (:...ownSources) THEN 1 ELSE 0 END)',
        'own',
      )
      .setParameter('ownSources', this.ownSources)
      .getRawOne<{
        total: string | number | null;
        inPractice: string | number | null;
        inFlashcards: string | number | null;
        own: string | number | null;
      }>();

    return {
      total: Number(row?.total ?? 0),
      inPractice: Number(row?.inPractice ?? 0),
      inFlashcards: Number(row?.inFlashcards ?? 0),
      own: Number(row?.own ?? 0),
    };
  }

  async getPhrase(id: number): Promise<PhrasebookStatementDto> {
    const phrase = await this.phraseRepo.findOne({
      where: { id },
      relations: ['tokens', 'category', 'group'],
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
      if (
        dto.category !== undefined ||
        dto.groupName !== undefined ||
        dto.categoryId !== undefined ||
        dto.groupId !== undefined
      ) {
        const organization = await this.resolveOrganization(clientId, dto);
        await this.persistOrganizationLinks(existing.id, organization);
      }
      return this.getPhrase(existing.id);
    }

    const fingerprint = this.phraseFingerprint(clientId, normalizedText);

    const organization = await this.resolveOrganization(clientId, dto);
    const phraseEntity = this.phraseRepo.create({
      clientId,
      fingerprint,
      createdAt: new Date(),
      text: normalizedText,
      language: dto.language || 'ga',
      translation: this.normalizeOptionalText(dto.translation, 2000) ?? undefined,
      pronunciation: this.normalizeOptionalText(dto.pronunciation, 500) ?? undefined,
      example: this.normalizeOptionalText(dto.example, 2000) ?? undefined,
      notes: this.normalizeOptionalText(dto.notes, 4000) ?? undefined,
      source: this.normalizeSource(dto.source, 'manual'),
      inPractice: Boolean(dto.inPractice),
      inFlashcards: Boolean(dto.inFlashcards),
      categoryId: organization.category?.id ?? null,
      groupId: organization.group?.id ?? null,
    });

    let saved: Phrase;
    try {
      saved = await this.phraseRepo.save(phraseEntity);
      await this.persistOrganizationLinks(saved.id, organization);
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
      relations: ['tokens', 'category', 'group'],
    });
    if (!phrase) throw new NotFoundException(`Phrase ${id} not found`);

    let organizationToPersist:
      | { category: PhraseCategory | null; group: PhraseGroup | null }
      | null = null;

    if (dto.text !== undefined) {
      phrase.text = this.normalizePhraseText(dto.text);
    }
    if (dto.translation !== undefined) {
      phrase.translation = this.normalizeOptionalText(dto.translation, 2000) ?? undefined;
    }
    if (dto.pronunciation !== undefined) {
      phrase.pronunciation = this.normalizeOptionalText(dto.pronunciation, 500) ?? undefined;
    }
    if (dto.example !== undefined) {
      phrase.example = this.normalizeOptionalText(dto.example, 2000) ?? undefined;
    }
    if (dto.notes !== undefined) {
      phrase.notes = this.normalizeOptionalText(dto.notes, 4000) ?? undefined;
    }
    if (typeof dto.inPractice === 'boolean') {
      phrase.inPractice = dto.inPractice;
    }
    if (typeof dto.inFlashcards === 'boolean') {
      phrase.inFlashcards = dto.inFlashcards;
    }
    if (typeof dto.source === 'string') {
      phrase.source = this.normalizeSource(dto.source, 'manual');
    }
    if (
      dto.category !== undefined ||
      dto.groupName !== undefined ||
      dto.categoryId !== undefined ||
      dto.groupId !== undefined
    ) {
      organizationToPersist = await this.resolveOrganization(phrase.clientId, dto);
      phrase.categoryId = organizationToPersist.category?.id ?? null;
      phrase.category = organizationToPersist.category ?? null;
      phrase.groupId = organizationToPersist.group?.id ?? null;
      phrase.group = organizationToPersist.group ?? null;
    }
    await this.phraseRepo.save(phrase);

    if (organizationToPersist) {
      await this.persistOrganizationLinks(phrase.id, organizationToPersist);
    }

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
      categoryId: p.categoryId ?? p.category?.id ?? null,
      category: p.category?.name ?? null,
      groupId: p.groupId ?? p.group?.id ?? null,
      groupName: p.group?.name ?? null,
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

  async listCategories(clientId: string): Promise<PhraseCategoryDto[]> {
    const categories = await this.categoryRepo.find({
      where: { clientId },
      relations: ['groups'],
      order: { name: 'ASC' },
    });
    return categories.map((category) => ({
      id: category.id,
      name: category.name,
      archived: Boolean(category.archivedAt),
      groupCount: Array.isArray(category.groups) ? category.groups.length : 0,
    }));
  }

  async createCategory(clientId: string, name: string): Promise<PhraseCategoryDto> {
    const category = await this.ensureCategory(clientId, name);
    if (!category) throw new BadRequestException('Category name is required');
    return {
      id: category.id,
      name: category.name,
      archived: Boolean(category.archivedAt),
      groupCount: 0,
    };
  }

  async updateCategory(
    clientId: string,
    id: number,
    body: { name?: string; archived?: boolean },
  ): Promise<PhraseCategoryDto> {
    const category = await this.categoryRepo.findOne({ where: { id, clientId } });
    if (!category) throw new NotFoundException(`Category ${id} not found`);
    if (body.name !== undefined) {
      const normalized = this.normalizeOptionalText(body.name, 100);
      if (!normalized) throw new BadRequestException('Category name is required');
      category.name = normalized;
    }
    if (typeof body.archived === 'boolean') {
      category.archivedAt = body.archived ? new Date() : null;
    }
    const saved = await this.categoryRepo.save(category);
    return {
      id: saved.id,
      name: saved.name,
      archived: Boolean(saved.archivedAt),
      groupCount: await this.groupRepo.count({ where: { categoryId: saved.id, clientId } }),
    };
  }

  async deleteCategory(clientId: string, id: number): Promise<{ success: boolean }> {
    await this.phraseRepo
      .createQueryBuilder()
      .update(Phrase)
      .set({ categoryId: null, groupId: null })
      .where('clientId = :clientId AND categoryId = :id', { clientId, id })
      .execute();
    await this.groupRepo.delete({ clientId, categoryId: id });
    const res = await this.categoryRepo.delete({ clientId, id });
    return { success: Boolean(res.affected) };
  }

  async listGroups(clientId: string, categoryId?: number): Promise<PhraseGroupDto[]> {
    const where = categoryId ? { clientId, categoryId } : { clientId };
    const groups = await this.groupRepo.find({ where, order: { name: 'ASC' } });
    return groups.map((group) => ({
      id: group.id,
      categoryId: group.categoryId,
      name: group.name,
      archived: Boolean(group.archivedAt),
    }));
  }

  async createGroup(
    clientId: string,
    categoryId: number | undefined,
    name: string,
  ): Promise<PhraseGroupDto> {
    if (!categoryId) throw new BadRequestException('Category is required');
    const category = await this.categoryRepo.findOne({ where: { id: categoryId, clientId } });
    if (!category) throw new NotFoundException(`Category ${categoryId} not found`);
    const group = await this.ensureGroup(clientId, category, name);
    if (!group) throw new BadRequestException('Group name is required');
    return {
      id: group.id,
      categoryId: group.categoryId,
      name: group.name,
      archived: Boolean(group.archivedAt),
    };
  }

  async updateGroup(
    clientId: string,
    id: number,
    body: { categoryId?: number; name?: string; archived?: boolean },
  ): Promise<PhraseGroupDto> {
    const group = await this.groupRepo.findOne({ where: { id, clientId } });
    if (!group) throw new NotFoundException(`Group ${id} not found`);
    if (typeof body.categoryId === 'number') {
      const category = await this.categoryRepo.findOne({ where: { id: body.categoryId, clientId } });
      if (!category) throw new NotFoundException(`Category ${body.categoryId} not found`);
      group.categoryId = body.categoryId;
    }
    if (body.name !== undefined) {
      const normalized = this.normalizeOptionalText(body.name, 150);
      if (!normalized) throw new BadRequestException('Group name is required');
      group.name = normalized;
    }
    if (typeof body.archived === 'boolean') {
      group.archivedAt = body.archived ? new Date() : null;
    }
    const saved = await this.groupRepo.save(group);
    return {
      id: saved.id,
      categoryId: saved.categoryId,
      name: saved.name,
      archived: Boolean(saved.archivedAt),
    };
  }

  async deleteGroup(clientId: string, id: number): Promise<{ success: boolean }> {
    await this.phraseRepo
      .createQueryBuilder()
      .update(Phrase)
      .set({ groupId: null })
      .where('clientId = :clientId AND groupId = :id', { clientId, id })
      .execute();
    const res = await this.groupRepo.delete({ clientId, id });
    return { success: Boolean(res.affected) };
  }
}
