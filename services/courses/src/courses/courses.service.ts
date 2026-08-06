import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomUUID } from 'crypto';
import { Repository } from 'typeorm';
import { ContentStore } from './courses.content';
import { compileLessonDraft } from './courses.drafts';
import {
  AdminCourseLessonDraftUpdateDto,
  AdminPreviewTokenRequestDto,
  AdminPublishReleaseRequestDto,
  CourseGlossLookupDto,
  CourseLexiconExposureDto,
  CourseProgressUpdateDto,
} from './courses.dto';
import {
  AdminAuditLog,
  CourseActiveRelease,
  CourseDraft,
  CourseLexiconEvent,
  CourseProgress,
  CourseRelease,
  CourseReleaseLesson,
  LessonDraft,
} from './courses.entity';
import { interactionTypeForExposure, sanitizeExposureTokens } from './courses.lexicon';
import {
  buildGlossIndex,
  buildMicroChunks,
  buildPedagogyView,
  nextMicroChunkId,
  resolveGlossWithContext,
  type GlossEntry,
  type MicroChunk,
} from './courses.micro';
import { signPreviewToken, verifyPreviewToken } from './courses.preview';
import { ContentManifest, LessonContent, LessonManifestRef, LessonPedagogyView } from './courses.types';

type SwapQuizStatus = 'idle' | 'empty' | 'incorrect' | 'correct';
type SwapQuizStateRow = {
  answer: string;
  status: SwapQuizStatus;
  attempts: number;
  solvedOptionKeys: string[];
};
type SwapQuizStatePayload = Record<string, SwapQuizStateRow>;

type AdminActor = {
  userId: number;
  clientId: string;
  role: 'admin';
};

type ReleaseBuildContext = {
  lessons: LessonContent[];
  courseMetaBySlug: Map<
    string,
    {
      courseTitle: string;
      lang: string;
      summary?: string | null;
    }
  >;
  status: 'candidate' | 'published';
  actorUserId: number | null;
  label?: string | null;
};

@Injectable()
export class CoursesService implements OnModuleInit {
  private readonly logger = new Logger(CoursesService.name);
  private readonly fileContent = new ContentStore();
  private readonly defaultTargetLanguage = process.env.COURSES_TARGET_LANGUAGE || 'ga';
  private readonly flashcardsUrl = process.env.FLASHCARDS_SERVICE_URL || 'http://flashcards:3012';
  private readonly phrasebookUrl = process.env.PHRASEBOOK_SERVICE_URL || 'http://phrasebook:3011';
  private readonly lexiconUrl = process.env.LEXICON_SERVICE_URL || 'http://lexicon:3010';
  private readonly contentProvider = (process.env.COURSES_CONTENT_PROVIDER || 'file').toLowerCase();
  private readonly previewEnabled = process.env.COURSES_PREVIEW_ENABLED !== 'false';
  private readonly previewSecret =
    process.env.COURSES_PREVIEW_SECRET || process.env.WEB_SESSION_SECRET || 'dev-courses-preview-secret';
  private readonly tasterCourseSlug = String(process.env.COURSES_TASTER_COURSE_SLUG || '').trim();
  private readonly tasterLessonSlug = String(process.env.COURSES_TASTER_LESSON_SLUG || '').trim();
  private readonly previewTtlSec = Math.max(
    60,
    Number(process.env.COURSES_PREVIEW_TOKEN_TTL_SEC || 30 * 60),
  );
  private readonly bootstrapFromFiles = process.env.COURSES_DB_BOOTSTRAP_FROM_FILES !== 'false';
  private readonly microChunkCache = new Map<string, MicroChunk[]>();
  private readonly glossIndexCache = new Map<string, Map<string, GlossEntry>>();
  private static readonly MAX_EVENT_ID_LENGTH = 128;

  constructor(
    @InjectRepository(CourseProgress)
    private readonly progressRepo: Repository<CourseProgress>,
    @InjectRepository(CourseLexiconEvent)
    private readonly lexiconEventsRepo: Repository<CourseLexiconEvent>,
    @InjectRepository(CourseDraft)
    private readonly courseDraftRepo: Repository<CourseDraft>,
    @InjectRepository(LessonDraft)
    private readonly lessonDraftRepo: Repository<LessonDraft>,
    @InjectRepository(CourseRelease)
    private readonly releaseRepo: Repository<CourseRelease>,
    @InjectRepository(CourseReleaseLesson)
    private readonly releaseLessonRepo: Repository<CourseReleaseLesson>,
    @InjectRepository(CourseActiveRelease)
    private readonly activeReleaseRepo: Repository<CourseActiveRelease>,
    @InjectRepository(AdminAuditLog)
    private readonly auditRepo: Repository<AdminAuditLog>,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.isDbProvider() || !this.bootstrapFromFiles) return;

    try {
      await this.bootstrapDbFromFileContent();
    } catch (error) {
      this.logger.error(
        'Failed to bootstrap DB content provider from file content',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private isDbProvider() {
    return this.contentProvider === 'db';
  }

  private cacheKeyForLesson(lesson: LessonContent): string {
    return `${lesson.courseSlug}:${lesson.lessonSlug}:${lesson.contentVersion}`;
  }

  private parseJsonSafe<T>(raw: string | null | undefined, fallback: T): T {
    if (!raw) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }

  private hashOf(value: unknown): string {
    return createHash('sha256').update(JSON.stringify(value ?? null)).digest('hex');
  }

  private toChunkIds(raw: string | null): string[] {
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((item) => String(item).trim()).filter(Boolean);
    } catch {
      return [];
    }
  }

  private serializeChunkIds(chunkIds: string[]): string {
    return JSON.stringify(Array.from(new Set(chunkIds)));
  }

  private sanitizeSwapQuizState(raw: unknown): SwapQuizStatePayload {
    if (!raw || typeof raw !== 'object') return {};
    const state: SwapQuizStatePayload = {};

    for (const [rawKey, rawValue] of Object.entries(raw as Record<string, unknown>)) {
      const key = String(rawKey || '').trim().slice(0, 128);
      if (!key || !rawValue || typeof rawValue !== 'object') continue;
      const row = rawValue as Record<string, unknown>;
      const statusValue = row.status;
      const status: SwapQuizStatus =
        statusValue === 'idle' ||
        statusValue === 'empty' ||
        statusValue === 'incorrect' ||
        statusValue === 'correct'
          ? statusValue
          : 'idle';

      const attempts = Number(row.attempts);
      const solvedOptionKeys = Array.isArray(row.solvedOptionKeys)
        ? Array.from(
            new Set(
              row.solvedOptionKeys
                .map((item) => String(item || '').trim().slice(0, 128))
                .filter(Boolean),
            ),
          ).slice(0, 256)
        : [];

      state[key] = {
        answer: typeof row.answer === 'string' ? row.answer.slice(0, 180) : '',
        status,
        attempts: Number.isFinite(attempts) && attempts > 0 ? Math.floor(attempts) : 0,
        solvedOptionKeys,
      };
    }

    return state;
  }

  private parseSwapQuizState(raw: string | null | undefined): SwapQuizStatePayload {
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw);
      return this.sanitizeSwapQuizState(parsed);
    } catch {
      return {};
    }
  }

  private serializeSwapQuizState(raw: unknown): string | null {
    const state = this.sanitizeSwapQuizState(raw);
    if (Object.keys(state).length === 0) return null;
    return JSON.stringify(state);
  }

  private chunksForLesson(lesson: LessonContent): MicroChunk[] {
    const key = this.cacheKeyForLesson(lesson);
    const cached = this.microChunkCache.get(key);
    if (cached) return cached;
    const chunks = buildMicroChunks(lesson.blocks, lesson.resumeBlocks || []);
    this.microChunkCache.set(key, chunks);
    return chunks;
  }

  private glossaryForLesson(lesson: LessonContent): Map<string, GlossEntry> {
    const key = this.cacheKeyForLesson(lesson);
    const cached = this.glossIndexCache.get(key);
    if (cached) return cached;
    const glossary = buildGlossIndex(lesson);
    this.glossIndexCache.set(key, glossary);
    return glossary;
  }

  private microProgressForLesson(lesson: LessonContent, progress: CourseProgress | null) {
    const chunks = this.chunksForLesson(lesson);
    const completedChunkIds = progress ? this.toChunkIds(progress.microCompletedChunkIds) : [];
    const nextChunk = nextMicroChunkId(chunks, completedChunkIds);
    const lastChunkId = progress?.microLastChunkId ?? nextChunk;

    return {
      enabled: true,
      chunks,
      nextChunkId: nextChunk,
      completedChunkIds,
      lastChunkId,
    };
  }

  private normalizeEventId(eventId: string): string {
    const trimmed = String(eventId || '').trim();
    if (!trimmed) return randomUUID();
    if (trimmed.length <= CoursesService.MAX_EVENT_ID_LENGTH) return trimmed;

    const hash = createHash('sha256').update(trimmed).digest('hex').slice(0, 24);
    const prefixMax = CoursesService.MAX_EVENT_ID_LENGTH - hash.length - 3;
    const prefix = trimmed.slice(0, Math.max(0, prefixMax)).replace(/[^a-zA-Z0-9:_-]/g, '_');
    return `${prefix}::${hash}`;
  }

  private async emitLexiconTokens(
    clientId: string,
    courseSlug: string,
    lessonSlug: string,
    contentVersion: string,
    source: 'render' | 'hover' | 'gloss' | 'swap_correct' | 'swap_incorrect',
    eventId: string,
    tokens: string[],
  ) {
    const normalizedEventId = this.normalizeEventId(eventId);
    const existing = await this.lexiconEventsRepo.findOne({
      where: { clientId, eventId: normalizedEventId },
    });
    if (existing) {
      return {
        deduped: true,
        emittedTokens: 0,
        interactionType: interactionTypeForExposure(source),
      };
    }

    const sanitized = sanitizeExposureTokens(tokens, 120);
    if (sanitized.length === 0) {
      return {
        deduped: false,
        emittedTokens: 0,
        interactionType: interactionTypeForExposure(source),
      };
    }

    const record = this.lexiconEventsRepo.create({
      clientId,
      courseSlug,
      lessonSlug,
      source,
      eventId: normalizedEventId,
      contentVersion,
    });
    await this.lexiconEventsRepo.save(record);

    const interactionType = interactionTypeForExposure(source);
    try {
      const response = await fetch(`${this.lexiconUrl}/ingest/exposure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: randomUUID(),
          clientId,
          language: this.defaultTargetLanguage,
          words: sanitized,
          interaction: {
            type: interactionType,
            timestamp: Date.now(),
          },
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Lexicon ingest failed (${response.status}): ${body || 'empty response'}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to emit lexicon exposure for clientId=${clientId}, source=${source}`,
        error instanceof Error ? error.stack : String(error),
      );
    }

    return {
      deduped: false,
      emittedTokens: sanitized.length,
      interactionType,
    };
  }

  private normalizePhraseText(value: string | null | undefined) {
    return String(value || '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private deckNameForLesson(lesson: LessonContent, pedagogy: LessonPedagogyView) {
    const unitName = this.normalizePhraseText(lesson.unitName || lesson.moduleName || lesson.courseTitle);
    const suffix = pedagogy.unitDeckSlug ? ` (${pedagogy.unitDeckSlug})` : '';
    return `Unit: ${unitName}${suffix}`.slice(0, 120);
  }

  private async parseResponseOrThrow(res: Response, fallback: string) {
    if (res.ok) {
      if (res.status === 204) return null;
      return res.json();
    }
    const body = await res.text();
    throw new Error(`${fallback} (${res.status}): ${body || 'empty response'}`);
  }

  private corePhrasesForAutoTrack(pedagogy: LessonPedagogyView) {
    return pedagogy.core_flow
      .map((phrase) => ({
        text: this.normalizePhraseText(phrase.text),
        translation: this.normalizePhraseText(phrase.translation),
        pronunciation: this.normalizePhraseText(phrase.pronunciation),
      }))
      .filter((phrase) => phrase.text && phrase.translation)
      .slice(0, 200);
  }

  private lessonRenderTokensForLexicon(lesson: LessonContent, pedagogy: LessonPedagogyView) {
    const fromPedagogy = pedagogy.core_flow.flatMap((phrase) =>
      (phrase.tokens || []).map((token) => token.token || token.lemma || ''),
    );
    const fromInclude = lesson.lexicon_include || [];
    return [...fromInclude, ...fromPedagogy]
      .map((token) => this.normalizePhraseText(token))
      .filter(Boolean);
  }

  private async autoTrackLessonLexicon(
    clientId: string,
    lesson: LessonContent,
    pedagogy: LessonPedagogyView,
  ) {
    if (!pedagogy.autoTrackLexicon) return;

    const tokens = this.lessonRenderTokensForLexicon(lesson, pedagogy);
    if (!tokens.length) return;

    await this.emitLexiconTokens(
      clientId,
      lesson.courseSlug,
      lesson.lessonSlug,
      lesson.contentVersion,
      'render',
      `render:${lesson.courseSlug}:${lesson.lessonSlug}:${lesson.contentVersion}`,
      tokens,
    );
  }

  private async autoTrackLessonPhrasebook(
    clientId: string,
    lesson: LessonContent,
    pedagogy: LessonPedagogyView,
  ) {
    if (!pedagogy.autoTrackPhrasebook) return;

    const phrases = this.corePhrasesForAutoTrack(pedagogy);
    if (!phrases.length) return;

    for (const phrase of phrases) {
      const requestId = randomUUID();
      const response = await fetch(
        `${this.phrasebookUrl}/phrases?clientId=${encodeURIComponent(clientId)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: phrase.text,
            translation: phrase.translation,
            pronunciation: phrase.pronunciation || undefined,
            notes: `Auto-added from ${lesson.courseTitle} / ${lesson.lessonTitle}`,
            source: 'course',
            language: lesson.lang || this.defaultTargetLanguage,
            inPractice: true,
            inFlashcards: true,
            requestId,
          }),
        },
      );
      if (!response.ok) {
        const body = await response.text();
        this.logger.warn(
          `Failed to auto-track phrasebook phrase for clientId=${clientId} (${response.status}): ${body || 'empty response'}`,
        );
      }
    }
  }

  private async autoPopulateUnitFlashcards(
    clientId: string,
    lesson: LessonContent,
    pedagogy: LessonPedagogyView,
  ) {
    if (!pedagogy.autoTrackPhrasebook) return;

    const phrases = this.corePhrasesForAutoTrack(pedagogy);
    if (!phrases.length) return;

    const deckName = this.deckNameForLesson(lesson, pedagogy);
    const deckDescription = `Auto deck for ${lesson.courseTitle} / ${lesson.unitName || lesson.moduleName || 'Unit'}`;

    const packsRes = await fetch(
      `${this.flashcardsUrl}/packs?clientId=${encodeURIComponent(clientId)}`,
    );
    const packs = (await this.parseResponseOrThrow(packsRes, 'Failed to list flashcard decks')) as Array<{
      id: number;
      name: string;
    }>;

    let packId = packs.find((pack) => pack.name === deckName)?.id;
    if (!packId) {
      const createPackRes = await fetch(
        `${this.flashcardsUrl}/packs?clientId=${encodeURIComponent(clientId)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: deckName,
            description: deckDescription,
            language: lesson.lang || this.defaultTargetLanguage,
          }),
        },
      );
      const created = (await this.parseResponseOrThrow(
        createPackRes,
        'Failed to create unit deck',
      )) as { id?: number };
      packId = Number(created?.id || 0);
      if (!packId) {
        throw new Error('Flashcard unit deck creation did not return a valid id');
      }
    }

    const packRes = await fetch(
      `${this.flashcardsUrl}/packs/${packId}?clientId=${encodeURIComponent(clientId)}`,
    );
    const pack = (await this.parseResponseOrThrow(packRes, 'Failed to load unit deck')) as {
      cards?: Array<{ front: string; back: string }>;
    };

    const existing = new Set(
      (pack.cards || []).map((card) => `${this.normalizePhraseText(card.front).toLowerCase()}::${this.normalizePhraseText(card.back).toLowerCase()}`),
    );

    for (const phrase of phrases) {
      const key = `${phrase.text.toLowerCase()}::${phrase.translation.toLowerCase()}`;
      if (existing.has(key)) continue;

      const createCardRes = await fetch(
        `${this.flashcardsUrl}/packs/${packId}/cards?clientId=${encodeURIComponent(clientId)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            front: phrase.text,
            back: phrase.translation,
            pronunciation: phrase.pronunciation || undefined,
            notes: `Auto-added from ${lesson.lessonTitle}`,
          }),
        },
      );
      await this.parseResponseOrThrow(createCardRes, 'Failed to create unit flashcard');
      existing.add(key);
    }
  }

  private async autoPopulateLessonArtifacts(
    clientId: string,
    lesson: LessonContent,
    pedagogy: LessonPedagogyView,
  ) {
    await this.autoTrackLessonLexicon(clientId, lesson, pedagogy);
    await this.autoTrackLessonPhrasebook(clientId, lesson, pedagogy);
    await this.autoPopulateUnitFlashcards(clientId, lesson, pedagogy);
  }

  private progressForLesson(lesson: LessonManifestRef, progress: CourseProgress | null) {
    return {
      lessonSlug: lesson.lessonSlug,
      lessonTitle: lesson.lessonTitle,
      moduleKey: lesson.moduleKey,
      moduleName: lesson.moduleName,
      unitKey: lesson.unitKey,
      unitName: lesson.unitName,
      group: lesson.group,
      order: lesson.order,
      estimatedMinutes: lesson.estimatedMinutes,
      summary: lesson.summary,
      tags: lesson.tags ?? [],
      contentVersion: lesson.contentVersion,
      progress: {
        status: progress?.status ?? 'not_started',
        progressPercent: progress?.progressPercent ?? 0,
        lastBlockId: progress?.lastBlockId ?? null,
        completedAt: progress?.completedAt ?? null,
        timeSpentSec: progress?.timeSpentSec ?? 0,
        lastSeenAt: progress?.lastSeenAt ?? null,
      },
    };
  }

  private progressStatusScore(status: CourseProgress['status'] | null | undefined): number {
    if (status === 'completed') return 2;
    if (status === 'in_progress') return 1;
    return 0;
  }

  private progressTimestamp(value: Date | string | null | undefined): number {
    if (!value) return 0;
    const timestamp = value instanceof Date ? value.getTime() : new Date(value).getTime();
    return Number.isFinite(timestamp) ? timestamp : 0;
  }

  private utcDayKey(value: Date | string | null | undefined): string | null {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().slice(0, 10);
  }

  private addUtcDays(value: Date, days: number): Date {
    const next = new Date(value);
    next.setUTCDate(next.getUTCDate() + days);
    return next;
  }

  private computeActivityStreak(progressRows: CourseProgress[]) {
    const activityDays = new Set<string>();

    for (const row of progressRows) {
      for (const value of [row.lastSeenAt, row.completedAt, row.startedAt]) {
        const key = this.utcDayKey(value);
        if (key) activityDays.add(key);
      }
    }

    const today = new Date();
    const todayKey = this.utcDayKey(today)!;
    const yesterday = this.addUtcDays(today, -1);
    const yesterdayKey = this.utcDayKey(yesterday)!;

    let cursor: Date | null = null;
    if (activityDays.has(todayKey)) {
      cursor = today;
    } else if (activityDays.has(yesterdayKey)) {
      cursor = yesterday;
    }

    let currentDays = 0;
    while (cursor) {
      const key = this.utcDayKey(cursor)!;
      if (!activityDays.has(key)) break;
      currentDays += 1;
      cursor = this.addUtcDays(cursor, -1);
    }

    return {
      currentDays,
      lastActivityDate: Array.from(activityDays).sort().at(-1) ?? null,
    };
  }

  private shouldPreferProgressRow(candidate: CourseProgress, current: CourseProgress): boolean {
    const candidateStatus = this.progressStatusScore(candidate.status);
    const currentStatus = this.progressStatusScore(current.status);
    if (candidateStatus !== currentStatus) return candidateStatus > currentStatus;

    const candidatePercent = Math.min(100, Math.max(0, Math.round(candidate.progressPercent || 0)));
    const currentPercent = Math.min(100, Math.max(0, Math.round(current.progressPercent || 0)));
    if (candidatePercent !== currentPercent) return candidatePercent > currentPercent;

    const candidateSeen = this.progressTimestamp(candidate.lastSeenAt);
    const currentSeen = this.progressTimestamp(current.lastSeenAt);
    if (candidateSeen !== currentSeen) return candidateSeen > currentSeen;

    const candidateUpdated = this.progressTimestamp(candidate.updatedAt);
    const currentUpdated = this.progressTimestamp(current.updatedAt);
    if (candidateUpdated !== currentUpdated) return candidateUpdated > currentUpdated;

    return Number(candidate.id || 0) > Number(current.id || 0);
  }

  private resolveBlockId(lesson: LessonContent, candidate?: string | null): string | null {
    if (!candidate) return lesson.blocks[0]?.id ?? null;
    const exists = lesson.blocks.some((block) => block.id === candidate);
    return exists ? candidate : lesson.blocks[0]?.id ?? null;
  }

  private blockOrderIndex(lesson: LessonContent, blockId: string | null | undefined): number {
    if (!blockId) return -1;
    return lesson.blocks.findIndex((block) => block.id === blockId);
  }

  private furthestBlockId(
    lesson: LessonContent,
    existing: string | null | undefined,
    incoming: string | null | undefined,
  ): string | null {
    const existingId = this.resolveBlockId(lesson, existing ?? null);
    const incomingId = this.resolveBlockId(lesson, incoming ?? null);

    const existingIdx = this.blockOrderIndex(lesson, existingId);
    const incomingIdx = this.blockOrderIndex(lesson, incomingId);

    if (incomingIdx >= existingIdx) return incomingId;
    return existingId;
  }

  private async writeAdminAudit(input: {
    actorUserId: number | null;
    action: string;
    targetType: string;
    targetId: string;
    before?: unknown;
    after?: unknown;
    metadata?: unknown;
  }) {
    const record = this.auditRepo.create({
      actorUserId: input.actorUserId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      beforeHash: input.before !== undefined ? this.hashOf(input.before) : null,
      afterHash: input.after !== undefined ? this.hashOf(input.after) : null,
      metadataJson: input.metadata !== undefined ? JSON.stringify(input.metadata) : null,
    });
    await this.auditRepo.save(record);
  }

  private async resolveReleaseIdForRead(previewToken?: string): Promise<string | null> {
    if (!this.isDbProvider()) return null;

    if (previewToken) {
      if (!this.previewEnabled) {
        throw new ForbiddenException('Preview mode is disabled');
      }
      const payload = verifyPreviewToken(previewToken, this.previewSecret);
      if (!payload) {
        throw new ForbiddenException('Invalid or expired preview token');
      }
      const release = await this.releaseRepo.findOne({ where: { id: String(payload.releaseId) } });
      if (!release) {
        throw new NotFoundException('Preview release not found');
      }
      return release.id;
    }

    const active = await this.activeReleaseRepo.findOne({ where: { id: 1 } });
    return active?.releaseId ?? null;
  }

  private async manifestForRead(previewToken?: string): Promise<ContentManifest> {
    if (!this.isDbProvider()) {
      return this.fileContent.getManifest();
    }

    const releaseId = await this.resolveReleaseIdForRead(previewToken);
    if (!releaseId) {
      return this.fileContent.getManifest();
    }

    const release = await this.releaseRepo.findOne({ where: { id: releaseId } });
    if (!release) {
      throw new NotFoundException('Active release not found');
    }

    return this.parseJsonSafe<ContentManifest>(release.manifestJson, {
      generatedAt: new Date().toISOString(),
      contentVersion: release.contentVersion,
      courses: [],
    });
  }

  private async lessonForRead(
    courseSlug: string,
    lessonSlug: string,
    previewToken?: string,
  ): Promise<LessonContent | null> {
    if (!this.isDbProvider()) {
      return this.fileContent.getLesson(courseSlug, lessonSlug);
    }

    const releaseId = await this.resolveReleaseIdForRead(previewToken);
    if (!releaseId) {
      return this.fileContent.getLesson(courseSlug, lessonSlug);
    }

    const row = await this.releaseLessonRepo.findOne({
      where: {
        releaseId,
        courseSlug,
        lessonSlug,
      },
    });
    if (!row) return null;

    return this.parseJsonSafe<LessonContent | null>(row.lessonJson, null);
  }

  private lessonToManifestRef(lesson: LessonContent): LessonManifestRef {
    return {
      lessonSlug: lesson.lessonSlug,
      lessonTitle: lesson.lessonTitle,
      moduleKey: lesson.moduleKey,
      moduleName: lesson.moduleName,
      unitKey: lesson.unitKey,
      unitName: lesson.unitName,
      group: lesson.group,
      order: lesson.order,
      estimatedMinutes: lesson.estimatedMinutes,
      summary: lesson.summary,
      tags: lesson.tags,
      contentVersion: lesson.contentVersion,
      file: '',
    };
  }

  private buildManifestFromLessons(
    lessons: LessonContent[],
    courseMetaBySlug: Map<string, { courseTitle: string; lang: string; summary?: string | null }>,
  ): ContentManifest {
    const courseMap = new Map<string, ContentManifest['courses'][number]>();

    for (const lesson of lessons) {
      const courseMeta = courseMetaBySlug.get(lesson.courseSlug);
      const course = courseMap.get(lesson.courseSlug) || {
        courseSlug: lesson.courseSlug,
        courseTitle: courseMeta?.courseTitle || lesson.courseTitle,
        lang: courseMeta?.lang || lesson.lang,
        summary: courseMeta?.summary || undefined,
        lessons: [],
      };

      course.lessons.push(this.lessonToManifestRef(lesson));
      courseMap.set(lesson.courseSlug, course);
    }

    const courses = Array.from(courseMap.values()).map((course) => ({
      ...course,
      lessons: course.lessons.slice().sort((a, b) => a.order - b.order),
    }));

    const manifestVersion = createHash('sha256')
      .update(lessons.map((lesson) => lesson.contentVersion).sort().join('|'))
      .digest('hex')
      .slice(0, 16);

    return {
      generatedAt: new Date().toISOString(),
      contentVersion: manifestVersion,
      courses,
    };
  }

  private async createReleaseFromLessons(input: ReleaseBuildContext): Promise<CourseRelease> {
    if (!input.lessons.length) {
      throw new BadRequestException('At least one lesson is required to create a release');
    }

    const manifest = this.buildManifestFromLessons(input.lessons, input.courseMetaBySlug);

    const release = this.releaseRepo.create({
      contentVersion: manifest.contentVersion,
      status: input.status,
      label: input.label ?? null,
      manifestJson: JSON.stringify(manifest),
      createdByUserId: input.actorUserId,
      publishedByUserId: input.status === 'published' ? input.actorUserId : null,
      publishedAt: input.status === 'published' ? new Date() : null,
    });
    const savedRelease = await this.releaseRepo.save(release);

    const releaseLessons = input.lessons.map((lesson) =>
      this.releaseLessonRepo.create({
        releaseId: savedRelease.id,
        courseSlug: lesson.courseSlug,
        lessonSlug: lesson.lessonSlug,
        contentVersion: lesson.contentVersion,
        lessonJson: JSON.stringify(lesson),
      }),
    );

    for (const chunk of this.chunkArray(releaseLessons, 100)) {
      await this.releaseLessonRepo.save(chunk);
    }

    return savedRelease;
  }

  private chunkArray<T>(input: T[], size: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < input.length; i += size) {
      out.push(input.slice(i, i + size));
    }
    return out;
  }

  private async bootstrapDbFromFileContent() {
    const existingActive = await this.activeReleaseRepo.findOne({ where: { id: 1 } });
    if (existingActive) return;

    const manifest = await this.fileContent.getManifest();
    if (!manifest.courses.length) return;

    const lessons: LessonContent[] = [];
    const courseMetaBySlug = new Map<string, { courseTitle: string; lang: string; summary?: string | null }>();

    for (const course of manifest.courses) {
      courseMetaBySlug.set(course.courseSlug, {
        courseTitle: course.courseTitle,
        lang: course.lang,
        summary: course.summary ?? null,
      });

      let courseDraft = await this.courseDraftRepo.findOne({ where: { courseSlug: course.courseSlug } });
      if (!courseDraft) {
        courseDraft = this.courseDraftRepo.create({
          courseSlug: course.courseSlug,
          courseTitle: course.courseTitle,
          lang: course.lang,
          summary: course.summary ?? null,
          updatedByUserId: null,
        });
        await this.courseDraftRepo.save(courseDraft);
      }

      for (const lessonRef of course.lessons) {
        const lesson = await this.fileContent.getLesson(course.courseSlug, lessonRef.lessonSlug);
        if (!lesson) continue;
        lessons.push(lesson);

        const existingDraft = await this.lessonDraftRepo.findOne({
          where: {
            courseSlug: course.courseSlug,
            lessonSlug: lessonRef.lessonSlug,
          },
        });
        if (!existingDraft) {
          const draft = this.lessonDraftRepo.create({
            courseSlug: lesson.courseSlug,
            lessonSlug: lesson.lessonSlug,
            lessonTitle: lesson.lessonTitle,
            moduleKey: lesson.moduleKey ?? null,
            moduleName: lesson.moduleName ?? null,
            unitKey: lesson.unitKey ?? null,
            unitName: lesson.unitName ?? null,
            group: lesson.group ?? null,
            order: lesson.order,
            lang: lesson.lang,
            estimatedMinutes: lesson.estimatedMinutes,
            summary: lesson.summary ?? null,
            tagsJson: JSON.stringify(lesson.tags || []),
            markdown: lesson.markdown,
            lessonJson: JSON.stringify(lesson),
            contentVersion: lesson.contentVersion,
            validationErrorsJson: JSON.stringify([]),
            isValid: true,
            revision: 1,
            updatedByUserId: null,
          });
          await this.lessonDraftRepo.save(draft);
        }
      }
    }

    if (!lessons.length) return;

    const release = await this.createReleaseFromLessons({
      lessons,
      courseMetaBySlug,
      status: 'published',
      actorUserId: null,
      label: 'bootstrap-file-import',
    });

    const active = this.activeReleaseRepo.create({
      id: 1,
      releaseId: release.id,
      updatedByUserId: null,
    });
    await this.activeReleaseRepo.save(active);

    this.logger.log(`Bootstrapped DB provider with release ${release.id}`);
  }

  private async lessonsFromValidDrafts(): Promise<{
    lessons: LessonContent[];
    courseMetaBySlug: Map<string, { courseTitle: string; lang: string; summary?: string | null }>;
  }> {
    const drafts = await this.lessonDraftRepo.find({ where: { isValid: true } });
    if (!drafts.length) {
      throw new BadRequestException('No valid lesson drafts available to build a release');
    }

    const lessons: LessonContent[] = [];
    for (const draft of drafts) {
      const lesson = this.parseJsonSafe<LessonContent | null>(draft.lessonJson, null);
      if (lesson) {
        lessons.push(lesson);
        continue;
      }

      const compiled = compileLessonDraft({
        courseSlug: draft.courseSlug,
        courseTitle: draft.courseSlug,
        lessonSlug: draft.lessonSlug,
        lessonTitle: draft.lessonTitle,
        moduleKey: draft.moduleKey ?? undefined,
        moduleName: draft.moduleName ?? undefined,
        unitKey: draft.unitKey ?? undefined,
        unitName: draft.unitName ?? undefined,
        group: draft.group ?? undefined,
        order: draft.order,
        lang: draft.lang,
        estimatedMinutes: draft.estimatedMinutes,
        summary: draft.summary ?? undefined,
        tags: this.parseJsonSafe<string[]>(draft.tagsJson, []),
        markdown: draft.markdown,
      });
      if (compiled.validationErrors.length === 0) {
        lessons.push(compiled.lesson);
      }
    }

    if (!lessons.length) {
      throw new BadRequestException('No valid lesson payloads available to build a release');
    }

    const courseDrafts = await this.courseDraftRepo.find();
    const courseMetaBySlug = new Map<string, { courseTitle: string; lang: string; summary?: string | null }>();
    for (const course of courseDrafts) {
      courseMetaBySlug.set(course.courseSlug, {
        courseTitle: course.courseTitle,
        lang: course.lang,
        summary: course.summary,
      });
    }

    return {
      lessons,
      courseMetaBySlug,
    };
  }

  private async setActiveRelease(releaseId: string, actorUserId: number | null) {
    const existing = await this.activeReleaseRepo.findOne({ where: { id: 1 } });
    if (!existing) {
      const created = this.activeReleaseRepo.create({
        id: 1,
        releaseId,
        updatedByUserId: actorUserId,
      });
      await this.activeReleaseRepo.save(created);
      return;
    }

    existing.releaseId = releaseId;
    existing.updatedByUserId = actorUserId;
    await this.activeReleaseRepo.save(existing);
  }

  private async hydrateDraftFromPublishedIfMissing(courseSlug: string, lessonSlug: string) {
    const existing = await this.lessonDraftRepo.findOne({ where: { courseSlug, lessonSlug } });
    if (existing) return existing;

    const lesson = await this.lessonForRead(courseSlug, lessonSlug);
    if (!lesson) return null;

    let courseDraft = await this.courseDraftRepo.findOne({ where: { courseSlug } });
    if (!courseDraft) {
      courseDraft = this.courseDraftRepo.create({
        courseSlug,
        courseTitle: lesson.courseTitle,
        lang: lesson.lang,
        summary: null,
        updatedByUserId: null,
      });
      await this.courseDraftRepo.save(courseDraft);
    }

    const created = this.lessonDraftRepo.create({
      courseSlug,
      lessonSlug,
      lessonTitle: lesson.lessonTitle,
      moduleKey: lesson.moduleKey ?? null,
      moduleName: lesson.moduleName ?? null,
      unitKey: lesson.unitKey ?? null,
      unitName: lesson.unitName ?? null,
      group: lesson.group ?? null,
      order: lesson.order,
      lang: lesson.lang,
      estimatedMinutes: lesson.estimatedMinutes,
      summary: lesson.summary ?? null,
      tagsJson: JSON.stringify(lesson.tags || []),
      markdown: lesson.markdown,
      lessonJson: JSON.stringify(lesson),
      contentVersion: lesson.contentVersion,
      validationErrorsJson: JSON.stringify([]),
      isValid: true,
      revision: 1,
      updatedByUserId: null,
    });

    return this.lessonDraftRepo.save(created);
  }

  async adminListCourses(actor: AdminActor) {
    const courseDrafts = await this.courseDraftRepo.find({ order: { courseSlug: 'ASC' } });
    const lessonDrafts = await this.lessonDraftRepo.find({ order: { courseSlug: 'ASC', order: 'ASC' } });
    const active = await this.activeReleaseRepo.findOne({ where: { id: 1 } });

    const byCourse = new Map<string, LessonDraft[]>();
    for (const lesson of lessonDrafts) {
      const list = byCourse.get(lesson.courseSlug) || [];
      list.push(lesson);
      byCourse.set(lesson.courseSlug, list);
    }

    const knownCourseSlugs = new Set<string>([
      ...courseDrafts.map((item) => item.courseSlug),
      ...lessonDrafts.map((item) => item.courseSlug),
    ]);

    const courses = Array.from(knownCourseSlugs)
      .sort((a, b) => a.localeCompare(b))
      .map((courseSlug) => {
        const draft = courseDrafts.find((item) => item.courseSlug === courseSlug) || null;
        const lessons = (byCourse.get(courseSlug) || []).slice().sort((a, b) => a.order - b.order);
        const validLessons = lessons.filter((item) => item.isValid).length;

        return {
          courseSlug,
          courseTitle: draft?.courseTitle || courseSlug,
          lang: draft?.lang || 'ga',
          summary: draft?.summary || null,
          lessonCount: lessons.length,
          validLessonCount: validLessons,
          lessons: lessons.map((lesson) => ({
            lessonSlug: lesson.lessonSlug,
            lessonTitle: lesson.lessonTitle,
            moduleKey: lesson.moduleKey,
            moduleName: lesson.moduleName,
            unitKey: lesson.unitKey,
            unitName: lesson.unitName,
            group: lesson.group,
            order: lesson.order,
            isValid: lesson.isValid,
            contentVersion: lesson.contentVersion,
            updatedAt: lesson.updatedAt,
          })),
          updatedAt:
            lessons[lessons.length - 1]?.updatedAt || draft?.updatedAt || new Date().toISOString(),
        };
      });

    await this.writeAdminAudit({
      actorUserId: actor.userId,
      action: 'admin_courses_listed',
      targetType: 'admin_courses',
      targetId: 'all',
      metadata: {
        count: courses.length,
      },
    });

    return {
      provider: this.contentProvider,
      activeReleaseId: active?.releaseId ?? null,
      courses,
    };
  }

  async adminGetLessonDraft(actor: AdminActor, courseSlug: string, lessonSlug: string) {
    const lessonDraft = await this.hydrateDraftFromPublishedIfMissing(courseSlug, lessonSlug);
    const courseDraft = await this.courseDraftRepo.findOne({ where: { courseSlug } });

    if (!lessonDraft) {
      return {
        course: {
          courseSlug,
          courseTitle: courseDraft?.courseTitle || courseSlug,
          lang: courseDraft?.lang || 'ga',
          summary: courseDraft?.summary || null,
        },
        lesson: {
          courseSlug,
          lessonSlug,
          lessonTitle: lessonSlug,
          order: 1,
          lang: courseDraft?.lang || 'ga',
          estimatedMinutes: 10,
          markdown: '',
          isValid: false,
          validationErrors: ['Draft not found'],
          contentVersion: null,
          revision: 0,
        },
      };
    }

    await this.writeAdminAudit({
      actorUserId: actor.userId,
      action: 'admin_lesson_draft_viewed',
      targetType: 'lesson_draft',
      targetId: `${courseSlug}:${lessonSlug}`,
    });

    return {
      course: {
        courseSlug,
        courseTitle: courseDraft?.courseTitle || courseSlug,
        lang: courseDraft?.lang || lessonDraft.lang,
        summary: courseDraft?.summary || null,
      },
      lesson: {
        courseSlug,
        lessonSlug,
        lessonTitle: lessonDraft.lessonTitle,
        moduleKey: lessonDraft.moduleKey,
        moduleName: lessonDraft.moduleName,
        unitKey: lessonDraft.unitKey,
        unitName: lessonDraft.unitName,
        group: lessonDraft.group,
        order: lessonDraft.order,
        lang: lessonDraft.lang,
        estimatedMinutes: lessonDraft.estimatedMinutes,
        summary: lessonDraft.summary,
        tags: this.parseJsonSafe<string[]>(lessonDraft.tagsJson, []),
        markdown: lessonDraft.markdown,
        isValid: lessonDraft.isValid,
        validationErrors: this.parseJsonSafe<string[]>(lessonDraft.validationErrorsJson, []),
        contentVersion: lessonDraft.contentVersion,
        revision: lessonDraft.revision,
        lessonJson: this.parseJsonSafe<Record<string, unknown> | null>(lessonDraft.lessonJson, null),
        updatedAt: lessonDraft.updatedAt,
      },
    };
  }

  async adminUpsertLessonDraft(
    actor: AdminActor,
    courseSlug: string,
    lessonSlug: string,
    dto: AdminCourseLessonDraftUpdateDto,
  ) {
    let courseDraft = await this.courseDraftRepo.findOne({ where: { courseSlug } });
    const existingLessonDraft = await this.hydrateDraftFromPublishedIfMissing(courseSlug, lessonSlug);
    const seedLesson = existingLessonDraft
      ? this.parseJsonSafe<LessonContent | null>(existingLessonDraft.lessonJson, null)
      : await this.lessonForRead(courseSlug, lessonSlug);

    if (!courseDraft) {
      courseDraft = this.courseDraftRepo.create({
        courseSlug,
        courseTitle:
          dto.courseTitle || seedLesson?.courseTitle || courseSlug.replace(/[-_]+/g, ' ').trim(),
        lang: dto.courseLang || dto.lang || seedLesson?.lang || 'ga',
        summary: dto.courseSummary ?? null,
        updatedByUserId: actor.userId,
      });
    } else {
      courseDraft.courseTitle = dto.courseTitle || courseDraft.courseTitle;
      courseDraft.lang = dto.courseLang || dto.lang || courseDraft.lang;
      courseDraft.summary = dto.courseSummary ?? courseDraft.summary;
      courseDraft.updatedByUserId = actor.userId;
    }
    courseDraft = await this.courseDraftRepo.save(courseDraft);

    const compileInput = {
      courseSlug,
      courseTitle: courseDraft.courseTitle,
      lessonSlug,
      lessonTitle: dto.lessonTitle || existingLessonDraft?.lessonTitle || seedLesson?.lessonTitle || lessonSlug,
      moduleKey:
        dto.moduleKey ?? existingLessonDraft?.moduleKey ?? seedLesson?.moduleKey ?? undefined,
      moduleName:
        dto.moduleName ?? existingLessonDraft?.moduleName ?? seedLesson?.moduleName ?? undefined,
      unitKey: dto.unitKey ?? existingLessonDraft?.unitKey ?? seedLesson?.unitKey ?? undefined,
      unitName:
        dto.unitName ?? existingLessonDraft?.unitName ?? seedLesson?.unitName ?? undefined,
      group: dto.group ?? existingLessonDraft?.group ?? seedLesson?.group ?? undefined,
      order: dto.order ?? existingLessonDraft?.order ?? seedLesson?.order ?? 1,
      lang: dto.lang || existingLessonDraft?.lang || seedLesson?.lang || courseDraft.lang || 'ga',
      estimatedMinutes:
        dto.estimatedMinutes ?? existingLessonDraft?.estimatedMinutes ?? seedLesson?.estimatedMinutes ?? 10,
      summary: dto.summary ?? existingLessonDraft?.summary ?? seedLesson?.summary ?? undefined,
      tags: dto.tags ?? this.parseJsonSafe<string[]>(existingLessonDraft?.tagsJson, seedLesson?.tags || []),
      resumeBlocks: dto.resumeBlocks ?? seedLesson?.resumeBlocks,
      lexicon_include: dto.lexicon_include ?? seedLesson?.lexicon_include,
      lexicon_exclude: dto.lexicon_exclude ?? seedLesson?.lexicon_exclude,
      tokenGlosses: dto.tokenGlosses ?? seedLesson?.tokenGlosses,
      pedagogy: dto.pedagogy ?? seedLesson?.pedagogy,
      markdown: dto.markdown ?? existingLessonDraft?.markdown ?? seedLesson?.markdown ?? '',
    };

    const compiled = compileLessonDraft(compileInput);

    const draft = existingLessonDraft
      ? existingLessonDraft
      : this.lessonDraftRepo.create({
          courseSlug,
          lessonSlug,
          lessonTitle: compiled.lesson.lessonTitle,
          markdown: compiled.lesson.markdown,
          order: compiled.lesson.order,
          lang: compiled.lesson.lang,
          estimatedMinutes: compiled.lesson.estimatedMinutes,
          revision: 0,
          isValid: false,
        } as LessonDraft);

    const beforeSnapshot = existingLessonDraft
      ? {
          contentVersion: existingLessonDraft.contentVersion,
          revision: existingLessonDraft.revision,
        }
      : null;

    draft.lessonTitle = compiled.lesson.lessonTitle;
    draft.moduleKey = compiled.lesson.moduleKey ?? null;
    draft.moduleName = compiled.lesson.moduleName ?? null;
    draft.unitKey = compiled.lesson.unitKey ?? null;
    draft.unitName = compiled.lesson.unitName ?? null;
    draft.group = compiled.lesson.group ?? null;
    draft.order = compiled.lesson.order;
    draft.lang = compiled.lesson.lang;
    draft.estimatedMinutes = compiled.lesson.estimatedMinutes;
    draft.summary = compiled.lesson.summary ?? null;
    draft.tagsJson = JSON.stringify(compiled.lesson.tags || []);
    draft.markdown = compiled.lesson.markdown;
    draft.lessonJson = JSON.stringify(compiled.lesson);
    draft.contentVersion = compiled.contentVersion;
    draft.validationErrorsJson = JSON.stringify(compiled.validationErrors);
    draft.isValid = compiled.validationErrors.length === 0;
    draft.revision = (existingLessonDraft?.revision || 0) + 1;
    draft.updatedByUserId = actor.userId;

    const saved = await this.lessonDraftRepo.save(draft);

    await this.writeAdminAudit({
      actorUserId: actor.userId,
      action: 'lesson_draft_upserted',
      targetType: 'lesson_draft',
      targetId: `${courseSlug}:${lessonSlug}`,
      before: beforeSnapshot,
      after: {
        contentVersion: saved.contentVersion,
        revision: saved.revision,
        isValid: saved.isValid,
      },
      metadata: {
        validationErrors: compiled.validationErrors,
      },
    });

    return {
      ok: true,
      lesson: {
        courseSlug,
        lessonSlug,
        lessonTitle: saved.lessonTitle,
        moduleKey: saved.moduleKey,
        moduleName: saved.moduleName,
        unitKey: saved.unitKey,
        unitName: saved.unitName,
        group: saved.group,
        order: saved.order,
        lang: saved.lang,
        estimatedMinutes: saved.estimatedMinutes,
        summary: saved.summary,
        tags: this.parseJsonSafe<string[]>(saved.tagsJson, []),
        markdown: saved.markdown,
        isValid: saved.isValid,
        validationErrors: this.parseJsonSafe<string[]>(saved.validationErrorsJson, []),
        contentVersion: saved.contentVersion,
        revision: saved.revision,
        updatedAt: saved.updatedAt,
      },
    };
  }

  async adminListReleases(actor: AdminActor) {
    const releases = await this.releaseRepo.find({
      order: { createdAt: 'DESC' },
      take: 50,
    });
    const active = await this.activeReleaseRepo.findOne({ where: { id: 1 } });

    await this.writeAdminAudit({
      actorUserId: actor.userId,
      action: 'admin_releases_listed',
      targetType: 'course_releases',
      targetId: 'all',
      metadata: { count: releases.length },
    });

    return {
      activeReleaseId: active?.releaseId ?? null,
      releases: releases.map((release) => ({
        id: release.id,
        status: release.status,
        label: release.label,
        contentVersion: release.contentVersion,
        createdByUserId: release.createdByUserId,
        publishedByUserId: release.publishedByUserId,
        createdAt: release.createdAt,
        publishedAt: release.publishedAt,
        isActive: release.id === active?.releaseId,
      })),
    };
  }

  async adminEngagementAnalytics(actor: AdminActor) {
    const [learnerCountRaw, progressRowsRaw, eventRowsRaw, lessonDrafts] = await Promise.all([
      this.progressRepo
        .createQueryBuilder('p')
        .select('COUNT(DISTINCT p.clientId)', 'value')
        .getRawOne<{ value: string }>(),
      this.progressRepo
        .createQueryBuilder('p')
        .select('p.courseSlug', 'courseSlug')
        .addSelect('p.lessonSlug', 'lessonSlug')
        .addSelect(
          "COUNT(DISTINCT CASE WHEN p.status IN ('in_progress','completed') THEN p.clientId END)",
          'startedCount',
        )
        .addSelect(
          "COUNT(DISTINCT CASE WHEN p.status = 'completed' THEN p.clientId END)",
          'completedCount',
        )
        .groupBy('p.courseSlug')
        .addGroupBy('p.lessonSlug')
        .getRawMany<{
          courseSlug: string;
          lessonSlug: string;
          startedCount: string;
          completedCount: string;
        }>(),
      this.lexiconEventsRepo
        .createQueryBuilder('e')
        .select('e.source', 'source')
        .addSelect('COUNT(*)', 'events')
        .addSelect('COUNT(DISTINCT e.clientId)', 'activeClients')
        .groupBy('e.source')
        .getRawMany<{ source: string; events: string; activeClients: string }>(),
      this.lessonDraftRepo.find({
        select: ['courseSlug', 'lessonSlug', 'lessonTitle'],
      }),
    ]);

    const lessonTitleByKey = new Map<string, string>();
    for (const draft of lessonDrafts) {
      lessonTitleByKey.set(`${draft.courseSlug}:${draft.lessonSlug}`, draft.lessonTitle);
    }

    const learnerCount = Number(learnerCountRaw?.value || 0);
    const lessons = progressRowsRaw.map((row) => {
      const startedCount = Number(row.startedCount || 0);
      const completedCount = Number(row.completedCount || 0);
      const dropoffCount = Math.max(0, startedCount - completedCount);
      const completionRate = startedCount > 0 ? completedCount / startedCount : 0;
      const dropoffRate = startedCount > 0 ? dropoffCount / startedCount : 0;
      const key = `${row.courseSlug}:${row.lessonSlug}`;
      return {
        courseSlug: row.courseSlug,
        lessonSlug: row.lessonSlug,
        lessonTitle: lessonTitleByKey.get(key) || row.lessonSlug,
        startedCount,
        completedCount,
        dropoffCount,
        completionRate: Number(completionRate.toFixed(4)),
        dropoffRate: Number(dropoffRate.toFixed(4)),
        isChallengeLesson: row.lessonSlug.toLowerCase().includes('challenge'),
        isRealWorldChallenge: row.lessonSlug.toLowerCase().includes('real-world-challenge'),
      };
    });

    const totals = lessons.reduce(
      (acc, row) => {
        acc.started += row.startedCount;
        acc.completed += row.completedCount;
        return acc;
      },
      { started: 0, completed: 0 },
    );

    const topDropoffLessons = lessons
      .filter((row) => row.startedCount >= 3)
      .sort((a, b) => {
        if (b.dropoffRate !== a.dropoffRate) return b.dropoffRate - a.dropoffRate;
        if (b.dropoffCount !== a.dropoffCount) return b.dropoffCount - a.dropoffCount;
        return b.startedCount - a.startedCount;
      })
      .slice(0, 10);

    const challengeLessonRows = lessons.filter((row) => row.isChallengeLesson);
    const realWorldRows = lessons.filter((row) => row.isRealWorldChallenge);
    const aggregate = (rows: typeof lessons) =>
      rows.reduce(
        (acc, row) => {
          acc.started += row.startedCount;
          acc.completed += row.completedCount;
          return acc;
        },
        { started: 0, completed: 0 },
      );

    const challengeTotals = aggregate(challengeLessonRows);
    const realWorldTotals = aggregate(realWorldRows);

    const sources = ['render', 'hover', 'gloss', 'swap_correct', 'swap_incorrect'] as const;
    const eventMap = new Map(eventRowsRaw.map((row) => [row.source, row]));
    const featureUsage = sources.map((source) => {
      const row = eventMap.get(source);
      return {
        source,
        events: Number(row?.events || 0),
        activeClients: Number(row?.activeClients || 0),
      };
    });

    await this.writeAdminAudit({
      actorUserId: actor.userId,
      action: 'admin_engagement_analytics_viewed',
      targetType: 'course_analytics',
      targetId: 'engagement',
      metadata: {
        learnerCount,
        lessons: lessons.length,
      },
    });

    return {
      learnerCount,
      lessonsTracked: lessons.length,
      lessonCompletion: {
        startedCount: totals.started,
        completedCount: totals.completed,
        completionRate: totals.started > 0 ? Number((totals.completed / totals.started).toFixed(4)) : 0,
      },
      dropoff: {
        topLessons: topDropoffLessons,
      },
      featureUsage,
      courseGoalSignals: {
        challengeLessons: {
          startedCount: challengeTotals.started,
          completedCount: challengeTotals.completed,
          completionRate:
            challengeTotals.started > 0
              ? Number((challengeTotals.completed / challengeTotals.started).toFixed(4))
              : 0,
        },
        realWorldChallenges: {
          startedCount: realWorldTotals.started,
          completedCount: realWorldTotals.completed,
          completionRate:
            realWorldTotals.started > 0
              ? Number((realWorldTotals.completed / realWorldTotals.started).toFixed(4))
              : 0,
        },
      },
    };
  }

  async adminIssuePreviewToken(actor: AdminActor, dto: AdminPreviewTokenRequestDto) {
    let release: CourseRelease | null = null;
    if (dto.releaseId) {
      release = await this.releaseRepo.findOne({ where: { id: dto.releaseId } });
      if (!release) {
        throw new NotFoundException('Release not found');
      }
    } else {
      const draftPayload = await this.lessonsFromValidDrafts();
      release = await this.createReleaseFromLessons({
        lessons: draftPayload.lessons,
        courseMetaBySlug: draftPayload.courseMetaBySlug,
        status: 'candidate',
        actorUserId: actor.userId,
      });
    }

    const token = signPreviewToken(
      {
        releaseId: release.id,
        actorUserId: actor.userId,
        ttlSec: this.previewTtlSec,
      },
      this.previewSecret,
    );

    await this.writeAdminAudit({
      actorUserId: actor.userId,
      action: 'preview_token_issued',
      targetType: 'course_release',
      targetId: release.id,
      metadata: {
        ttlSec: this.previewTtlSec,
      },
    });

    return {
      releaseId: release.id,
      token,
      expiresInSec: this.previewTtlSec,
    };
  }

  async adminPublishRelease(actor: AdminActor, dto: AdminPublishReleaseRequestDto) {
    let release: CourseRelease | null = null;

    if (dto.releaseId) {
      release = await this.releaseRepo.findOne({ where: { id: dto.releaseId } });
      if (!release) {
        throw new NotFoundException('Release not found');
      }

      if (release.status !== 'published') {
        release.status = 'published';
        release.publishedAt = new Date();
        release.publishedByUserId = actor.userId;
      }
      if (dto.label) {
        release.label = dto.label;
      }
      release = await this.releaseRepo.save(release);
    } else {
      const draftPayload = await this.lessonsFromValidDrafts();
      release = await this.createReleaseFromLessons({
        lessons: draftPayload.lessons,
        courseMetaBySlug: draftPayload.courseMetaBySlug,
        status: 'published',
        actorUserId: actor.userId,
        label: dto.label ?? null,
      });
    }

    await this.setActiveRelease(release.id, actor.userId);

    await this.writeAdminAudit({
      actorUserId: actor.userId,
      action: 'release_published',
      targetType: 'course_release',
      targetId: release.id,
      metadata: {
        label: release.label,
        contentVersion: release.contentVersion,
      },
    });

    return {
      ok: true,
      activeReleaseId: release.id,
      release: {
        id: release.id,
        status: release.status,
        label: release.label,
        contentVersion: release.contentVersion,
        createdAt: release.createdAt,
        publishedAt: release.publishedAt,
      },
    };
  }

  async getCatalog(clientId: string, previewToken?: string) {
    const manifest = await this.manifestForRead(previewToken);
    const progressRows = await this.progressRepo.find({ where: { clientId } });
    const activityStreak = this.computeActivityStreak(progressRows);
    const progressByLessonKey = new Map<string, CourseProgress>();

    for (const row of progressRows) {
      const key = `${row.courseSlug}::${row.lessonSlug}`;
      const current = progressByLessonKey.get(key);
      if (!current || this.shouldPreferProgressRow(row, current)) {
        progressByLessonKey.set(key, row);
      }
    }

    const courses = manifest.courses.map((course) => {
      const lessons = course.lessons
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((lesson) => {
          const key = `${course.courseSlug}::${lesson.lessonSlug}`;
          const progress = progressByLessonKey.get(key) ?? null;

          return this.progressForLesson(lesson, progress);
        });

      const completedLessons = lessons.filter((lesson) => lesson.progress.status === 'completed').length;
      const aggregateProgressPercent = lessons.length
        ? Math.round((completedLessons / lessons.length) * 100)
        : 0;
      const startedLessons = lessons
        .filter(
          (lesson) =>
            lesson.progress.status !== 'not_started' ||
            lesson.progress.progressPercent > 0 ||
            Boolean(lesson.progress.lastSeenAt),
        )
        .sort((a, b) => {
          const seenA = a.progress.lastSeenAt ? new Date(a.progress.lastSeenAt).getTime() : 0;
          const seenB = b.progress.lastSeenAt ? new Date(b.progress.lastSeenAt).getTime() : 0;
          if (seenB !== seenA) return seenB - seenA;
          if (b.progress.progressPercent !== a.progress.progressPercent) {
            return b.progress.progressPercent - a.progress.progressPercent;
          }
          return a.order - b.order;
        });

      const resumeLesson =
        startedLessons[0] ?? lessons.find((lesson) => lesson.progress.status === 'not_started') ?? null;

      return {
        courseSlug: course.courseSlug,
        courseTitle: course.courseTitle,
        lang: course.lang,
        summary: course.summary,
        contentVersion: manifest.contentVersion,
        lessons,
        summaryProgress: {
          completedLessons,
          totalLessons: lessons.length,
          percent: aggregateProgressPercent,
        },
        resumeTarget: resumeLesson
          ? {
              courseSlug: course.courseSlug,
              lessonSlug: resumeLesson.lessonSlug,
              lastBlockId: resumeLesson.progress.lastBlockId,
            }
          : null,
      };
    });

    return {
      generatedAt: manifest.generatedAt,
      contentVersion: manifest.contentVersion,
      activityStreak,
      courses,
    };
  }

  private pickDefaultTasterTarget(manifest: ContentManifest): {
    courseSlug: string;
    lessonSlug: string;
  } | null {
    if (!manifest.courses.length) return null;

    const bySlug = manifest.courses
      .slice()
      .sort((a, b) => a.courseSlug.localeCompare(b.courseSlug));

    let course = bySlug[0];

    if (this.tasterCourseSlug) {
      const configuredCourse = manifest.courses.find((item) => item.courseSlug === this.tasterCourseSlug);
      if (!configuredCourse) {
        throw new NotFoundException(`Configured taster course not found: ${this.tasterCourseSlug}`);
      }
      course = configuredCourse;
    } else {
      const cafeCourse = manifest.courses.find((item) => item.courseSlug === 'cafe');
      if (cafeCourse) {
        course = cafeCourse;
      }
    }

    const lessons = course.lessons.slice().sort((a, b) => a.order - b.order);
    if (!lessons.length) {
      throw new NotFoundException(`No lessons found for taster course: ${course.courseSlug}`);
    }

    const lesson =
      (this.tasterLessonSlug
        ? lessons.find((item) => item.lessonSlug === this.tasterLessonSlug)
        : undefined) || lessons[0];

    if (!lesson) {
      throw new NotFoundException(
        `Configured taster lesson not found: ${course.courseSlug}/${this.tasterLessonSlug}`,
      );
    }

    return {
      courseSlug: course.courseSlug,
      lessonSlug: lesson.lessonSlug,
    };
  }

  async getTaster() {
    const manifest = await this.manifestForRead();
    const target = this.pickDefaultTasterTarget(manifest);
    if (!target) {
      throw new NotFoundException('Taster content is unavailable');
    }

    const lesson = await this.lessonForRead(target.courseSlug, target.lessonSlug);
    if (!lesson) {
      throw new NotFoundException('Taster lesson not found');
    }

    const pedagogy = buildPedagogyView(lesson);

    return {
      lesson,
      progress: {
        status: 'not_started',
        progressPercent: 0,
        lastBlockId: this.resolveBlockId(lesson, null),
        completedAt: null,
        timeSpentSec: 0,
        lastSeenAt: null,
        contentVersion: lesson.contentVersion,
        swapQuizState: {},
      },
      micro: this.microProgressForLesson(lesson, null),
      pedagogy,
      taster: {
        public: true,
        courseSlug: target.courseSlug,
        lessonSlug: target.lessonSlug,
      },
    };
  }

  async getLesson(clientId: string, courseSlug: string, lessonSlug: string, previewToken?: string) {
    const lesson = await this.lessonForRead(courseSlug, lessonSlug, previewToken);
    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    const progress = await this.progressRepo.findOne({
      where: {
        clientId,
        courseSlug,
        lessonSlug,
      },
    });

    const resolvedBlockId = this.resolveBlockId(lesson, progress?.lastBlockId ?? null);
    const micro = this.microProgressForLesson(lesson, progress);
    const pedagogy = buildPedagogyView(lesson);
    const swapQuizState =
      progress?.contentVersion === lesson.contentVersion
        ? this.parseSwapQuizState(progress?.swapQuizState)
        : {};

    if (!previewToken) {
      void this.autoPopulateLessonArtifacts(clientId, lesson, pedagogy).catch((error) => {
        this.logger.warn(
          `Auto-populate lesson artifacts failed for clientId=${clientId}, lesson=${lesson.courseSlug}/${lesson.lessonSlug}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      });
    }

    return {
      lesson,
      progress: {
        status: progress?.status ?? 'not_started',
        progressPercent: progress?.progressPercent ?? 0,
        lastBlockId: resolvedBlockId,
        completedAt: progress?.completedAt ?? null,
        timeSpentSec: progress?.timeSpentSec ?? 0,
        lastSeenAt: progress?.lastSeenAt ?? null,
        contentVersion: lesson.contentVersion,
        swapQuizState,
      },
      micro,
      pedagogy,
    };
  }

  async updateProgress(
    clientId: string,
    courseSlug: string,
    lessonSlug: string,
    dto: CourseProgressUpdateDto,
    previewToken?: string,
  ) {
    const lesson = await this.lessonForRead(courseSlug, lessonSlug, previewToken);
    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    if (previewToken) {
      const progress = await this.progressRepo.findOne({
        where: { clientId, courseSlug, lessonSlug },
      });
      return {
        ok: true,
        readOnly: true,
        progress: {
          status: progress?.status ?? 'not_started',
          progressPercent: progress?.progressPercent ?? 0,
          lastBlockId: this.resolveBlockId(lesson, progress?.lastBlockId ?? null),
          completedAt: progress?.completedAt ?? null,
          timeSpentSec: progress?.timeSpentSec ?? 0,
          lastSeenAt: progress?.lastSeenAt ?? null,
          contentVersion: lesson.contentVersion,
          swapQuizState:
            progress?.contentVersion === lesson.contentVersion
              ? this.parseSwapQuizState(progress?.swapQuizState)
              : {},
        },
        micro: this.microProgressForLesson(lesson, progress),
      };
    }

    let row = await this.progressRepo.findOne({
      where: { clientId, courseSlug, lessonSlug },
    });

    if (!row) {
      row = this.progressRepo.create({
        clientId,
        courseSlug,
        lessonSlug,
        contentVersion: lesson.contentVersion,
        status: 'not_started',
        progressPercent: 0,
        lastBlockId: null,
        timeSpentSec: 0,
        microCompletedChunkIds: null,
        microLastChunkId: null,
        microUpdatedAt: null,
        swapQuizState: null,
        startedAt: null,
        lastSeenAt: new Date(),
        completedAt: null,
      });
    }

    const now = new Date();
    const contentVersionChanged = row.contentVersion && row.contentVersion !== lesson.contentVersion;
    if (contentVersionChanged) {
      row.swapQuizState = null;
    }
    const chunks = this.chunksForLesson(lesson);
    const validChunkIds = new Set(chunks.map((chunk) => chunk.id));
    const existingCompleted = this.toChunkIds(row.microCompletedChunkIds);
    const completed = new Set(existingCompleted);

    if (dto.lastBlockId !== undefined) {
      row.lastBlockId = this.furthestBlockId(lesson, row.lastBlockId, dto.lastBlockId);
    }

    if (dto.progressPercent !== undefined) {
      const incomingPercent = Math.min(100, Math.max(0, Math.round(dto.progressPercent)));
      row.progressPercent = Math.max(row.progressPercent || 0, incomingPercent);
    }

    if (dto.timeSpentDeltaSec !== undefined) {
      row.timeSpentSec += Math.max(0, dto.timeSpentDeltaSec);
    }

    if (dto.swapQuizState !== undefined) {
      row.swapQuizState = this.serializeSwapQuizState(dto.swapQuizState);
    }

    if (dto.micro?.completedChunkIds?.length) {
      for (const chunkId of dto.micro.completedChunkIds) {
        if (validChunkIds.has(chunkId)) {
          completed.add(chunkId);
        }
      }
      row.microCompletedChunkIds = this.serializeChunkIds(Array.from(completed));
      row.microUpdatedAt = now;
    } else if (existingCompleted.length && !row.microCompletedChunkIds) {
      row.microCompletedChunkIds = this.serializeChunkIds(existingCompleted);
    }

    if (dto.micro?.lastChunkId !== undefined) {
      row.microLastChunkId =
        dto.micro.lastChunkId && validChunkIds.has(dto.micro.lastChunkId) ? dto.micro.lastChunkId : null;
      row.microUpdatedAt = now;
    }

    const allMicroChunksCompleted = chunks.length > 0 && completed.size >= chunks.length;

    if (dto.completed === true) {
      row.status = 'completed';
      row.completedAt = now;
      row.progressPercent = 100;
    } else if (allMicroChunksCompleted) {
      row.status = 'completed';
      row.completedAt = now;
      row.progressPercent = 100;
    } else if (row.status !== 'completed') {
      if (row.progressPercent > 0 || row.lastBlockId || (dto.timeSpentDeltaSec ?? 0) > 0) {
        row.status = 'in_progress';
      }
      if (completed.size > 0) {
        row.status = 'in_progress';
      }
    }

    if (!row.startedAt && row.status !== 'not_started') {
      row.startedAt = now;
    }

    row.contentVersion = lesson.contentVersion;
    row.lastSeenAt = now;

    const saved = await this.progressRepo.save(row);

    return {
      ok: true,
      progress: {
        status: saved.status,
        progressPercent: saved.progressPercent,
        lastBlockId: this.resolveBlockId(lesson, saved.lastBlockId),
        completedAt: saved.completedAt,
        timeSpentSec: saved.timeSpentSec,
        lastSeenAt: saved.lastSeenAt,
        contentVersion: lesson.contentVersion,
        swapQuizState: this.parseSwapQuizState(saved.swapQuizState),
      },
      micro: this.microProgressForLesson(lesson, saved),
    };
  }

  async recordLexiconExposure(
    clientId: string,
    courseSlug: string,
    lessonSlug: string,
    dto: CourseLexiconExposureDto,
    previewToken?: string,
  ) {
    if (previewToken) {
      return {
        ok: true,
        readOnly: true,
        deduped: true,
        emittedTokens: 0,
        interactionType: interactionTypeForExposure(dto.source),
      };
    }

    const lesson = await this.lessonForRead(courseSlug, lessonSlug, previewToken);
    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    const result = await this.emitLexiconTokens(
      clientId,
      courseSlug,
      lessonSlug,
      lesson.contentVersion,
      dto.source,
      dto.eventId,
      dto.tokens,
    );
    return { ok: true, ...result };
  }

  async lookupGloss(
    clientId: string,
    courseSlug: string,
    lessonSlug: string,
    dto: CourseGlossLookupDto,
    previewToken?: string,
  ) {
    const lesson = await this.lessonForRead(courseSlug, lessonSlug, previewToken);
    if (!lesson) {
      throw new NotFoundException('Lesson not found');
    }

    const glossary = this.glossaryForLesson(lesson);
    const gloss = resolveGlossWithContext(lesson.blocks, glossary, dto.token, dto.context, dto.blockId);
    const eventId = `gloss:${lesson.courseSlug}:${lesson.lessonSlug}:${gloss.token}`;

    if (!previewToken) {
      try {
        await this.emitLexiconTokens(
          clientId,
          courseSlug,
          lessonSlug,
          lesson.contentVersion,
          'gloss',
          eventId,
          [gloss.token],
        );
      } catch (error) {
        this.logger.warn(
          `Gloss lookup token emit failed for clientId=${clientId}`,
          error instanceof Error ? error.message : String(error),
        );
      }
    }

    return {
      token: gloss.token,
      lemma: gloss.lemma,
      pronunciation: gloss.pronunciation,
      translation: gloss.translation,
      pos: gloss.pos,
      shortNote: gloss.shortNote ?? 'No gloss yet for this token.',
      examples: gloss.examples,
    };
  }
}
