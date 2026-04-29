import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { randomUUID } from 'crypto';

import {
  KafkaProducer,
  KafkaTopics,
} from '@decyphr/messaging';

import {
  CreateFlashcardDto,
  CreateFlashcardPackDto,
  CreateFlashcardPackWithCardsDto,
  GetDueCardsQueryDto,
  GetFlashcardHealthQueryDto,
  RecordAttemptDto,
} from './flashcards.dto';
import {
  Flashcard,
  FlashcardAttempt,
  FlashcardPack,
} from './flashcards.entity';

type FlashcardGrade = 'again' | 'hard' | 'good' | 'easy';

@Injectable()
export class FlashcardsService {
  private readonly logger = new Logger(FlashcardsService.name);
  private readonly lexiconUrl = process.env.LEXICON_SERVICE_URL || 'http://lexicon:3010';

  constructor(
    @InjectRepository(FlashcardPack)
    private readonly packRepo: Repository<FlashcardPack>,
    @InjectRepository(Flashcard)
    private readonly cardRepo: Repository<Flashcard>,
    @InjectRepository(FlashcardAttempt)
    private readonly attemptRepo: Repository<FlashcardAttempt>,
    private readonly kafkaProducer: KafkaProducer,
  ) {}

  private clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
  }

  private nextMidnight(daysFromNow: number): Date {
    const due = new Date();
    due.setHours(0, 0, 0, 0);
    due.setDate(due.getDate() + daysFromNow);
    return due;
  }

  private computeSchedule(card: Flashcard, grade: FlashcardGrade) {
    const previousEase = card.easeFactor || 2.5;
    const previousInterval = card.intervalDays || 0;
    const previousStreak = card.consecutiveCorrect || 0;

    let nextEase = previousEase;
    let nextInterval = previousInterval;
    let nextStreak = previousStreak;
    let lapseIncrement = 0;

    switch (grade) {
      case 'again':
        nextEase = this.clamp(previousEase - 0.2, 1.3, 3.0);
        nextInterval = 0;
        nextStreak = 0;
        lapseIncrement = 1;
        break;
      case 'hard':
        nextEase = this.clamp(previousEase - 0.15, 1.3, 3.0);
        nextInterval = Math.max(1, Math.round(previousInterval * 1.2));
        if (previousInterval === 0) {
          nextInterval = 1;
        }
        nextStreak = previousStreak + 1;
        break;
      case 'good':
        nextEase = this.clamp(previousEase + 0.05, 1.3, 3.0);
        if (previousInterval <= 0) {
          nextInterval = 1;
        } else if (previousInterval === 1) {
          nextInterval = 3;
        } else {
          nextInterval = Math.round(previousInterval * previousEase);
        }
        nextStreak = previousStreak + 1;
        break;
      case 'easy':
        nextEase = this.clamp(previousEase + 0.15, 1.3, 3.0);
        if (previousInterval <= 0) {
          nextInterval = 3;
        } else {
          nextInterval = Math.round(previousInterval * (previousEase + 0.35));
        }
        nextStreak = previousStreak + 1;
        break;
    }

    const dueAt = grade === 'again' ? new Date(Date.now() + 5 * 60 * 1000) : this.nextMidnight(nextInterval);

    return {
      previousEase,
      nextEase,
      previousInterval,
      nextInterval,
      nextStreak,
      lapseIncrement,
      dueAt,
    };
  }

  private async emitFlashcardsEvent(payload: {
    type: string;
    clientId: string;
    packId?: number;
    cardId?: number;
    attemptId?: number;
    grade?: FlashcardGrade;
    dueAt?: string;
    totalDue?: number;
  }) {
    await this.kafkaProducer.request(KafkaTopics.FLASHCARDS_EVENTS, {
      ...payload,
      timestamp: Date.now(),
    });
  }

  private async emitLexiconInteractionFromAttempt(
    card: Flashcard,
    clientId: string,
    grade: FlashcardGrade,
  ) {
    const isCorrect = grade === 'good' || grade === 'easy';
    const interactionType = isCorrect
      ? 'flashcard_guess_correct'
      : 'flashcard_guess_incorrect';

    const response = await fetch(`${this.lexiconUrl}/ingest/statement-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestId: randomUUID(),
        clientId,
        changes: {
          text: card.front,
          translation: card.back,
          pronunciation: card.pronunciation ?? undefined,
          notes: card.notes ?? undefined,
        },
        interaction: {
          type: interactionType,
          timestamp: Date.now(),
        },
        type: 'statement_updated',
        autoTranslate: false,
        timestamp: Date.now(),
        language: card.pack?.language ?? 'ga',
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(
        `Lexicon ingest failed (${response.status})${body ? `: ${body}` : ''}`,
      );
    }
  }

  async createPack(clientId: string, dto: CreateFlashcardPackDto) {
    const pack = await this.packRepo.save(
      this.packRepo.create({
        clientId,
        name: dto.name,
        description: dto.description ?? null,
        language: dto.language ?? 'ga',
      }),
    );

    await this.emitFlashcardsEvent({
      type: 'flashcards.pack.created',
      clientId,
      packId: pack.id,
    });

    return pack;
  }

  async createPackWithCards(clientId: string, dto: CreateFlashcardPackWithCardsDto) {
    const pack = await this.createPack(clientId, dto);

    if (dto.cards?.length) {
      const createdCards = dto.cards.map((card) =>
        this.cardRepo.create({
          packId: pack.id,
          front: card.front,
          back: card.back,
          pronunciation: card.pronunciation ?? null,
          notes: card.notes ?? null,
          dueAt: this.nextMidnight(card.dueInDays ?? 0),
        }),
      );

      await this.cardRepo.save(createdCards);

      await this.emitFlashcardsEvent({
        type: 'flashcards.cards.bulk_created',
        clientId,
        packId: pack.id,
      });
    }

    return this.getPack(clientId, pack.id);
  }

  async listPacks(clientId: string) {
    const packs = await this.packRepo.find({ where: { clientId } });

    const withStats = await Promise.all(
      packs.map(async (pack) => {
        const cardCount = await this.cardRepo.count({ where: { packId: pack.id } });
        const dueCount = await this.cardRepo
          .createQueryBuilder('card')
          .where('card.packId = :packId', { packId: pack.id })
          .andWhere('card.dueAt <= :now', { now: new Date() })
          .getCount();

        return {
          ...pack,
          cardCount,
          dueCount,
        };
      }),
    );

    return withStats;
  }

  async getPack(clientId: string, packId: number) {
    const pack = await this.packRepo.findOne({
      where: { id: packId, clientId },
    });

    if (!pack) {
      throw new NotFoundException(`Pack ${packId} not found`);
    }

    const cards = await this.cardRepo.find({
      where: { packId: pack.id },
      order: { id: 'ASC' },
    });

    return {
      ...pack,
      cards,
    };
  }

  async createCard(clientId: string, packId: number, dto: CreateFlashcardDto) {
    const pack = await this.packRepo.findOne({ where: { id: packId, clientId } });
    if (!pack) {
      throw new NotFoundException(`Pack ${packId} not found`);
    }

    const card = await this.cardRepo.save(
      this.cardRepo.create({
        packId,
        front: dto.front,
        back: dto.back,
        pronunciation: dto.pronunciation ?? null,
        notes: dto.notes ?? null,
        dueAt: this.nextMidnight(dto.dueInDays ?? 0),
      }),
    );

    await this.emitFlashcardsEvent({
      type: 'flashcards.card.created',
      clientId,
      packId,
      cardId: card.id,
    });

    return card;
  }

  async getDueCards(clientId: string, query: GetDueCardsQueryDto) {
    const qb = this.cardRepo
      .createQueryBuilder('card')
      .innerJoin(FlashcardPack, 'pack', 'pack.id = card.packId')
      .where('pack.clientId = :clientId', { clientId })
      .andWhere('card.dueAt <= :now', { now: new Date() })
      .orderBy('card.dueAt', 'ASC')
      .addOrderBy('card.id', 'ASC')
      .limit(query.limit ?? 20);

    if (query.packId) {
      qb.andWhere('card.packId = :packId', { packId: query.packId });
    }

    const cards = await qb.getMany();
    return cards;
  }

  async getHealth(clientId: string, query: GetFlashcardHealthQueryDto) {
    const limit = Math.max(1, Math.min(50, Number(query.limit || 5)));
    const lookbackDays = Math.max(7, Math.min(365, Number(query.lookbackDays || 30)));
    const now = new Date();
    const since = new Date(now.getTime() - lookbackDays * 24 * 60 * 60 * 1000);

    const dueCardCount = await this.cardRepo
      .createQueryBuilder('card')
      .innerJoin(FlashcardPack, 'pack', 'pack.id = card.packId')
      .where('pack.clientId = :clientId', { clientId })
      .andWhere('card.dueAt <= :now', { now })
      .getCount();

    const candidateLimit = Math.max(limit * 10, 80);
    const cards = await this.cardRepo
      .createQueryBuilder('card')
      .innerJoinAndSelect('card.pack', 'pack')
      .where('pack.clientId = :clientId', { clientId })
      .orderBy('card.dueAt', 'ASC')
      .addOrderBy('card.lastReviewedAt', 'ASC')
      .limit(candidateLimit)
      .getMany();

    if (cards.length === 0) {
      return {
        rows: [],
        dueCardCount: 0,
        lookedBackDays: lookbackDays,
        generatedAt: now.toISOString(),
      };
    }

    const cardIds = cards.map((card) => card.id);
    const recentAttemptStatsRaw = await this.attemptRepo
      .createQueryBuilder('attempt')
      .select('attempt.cardId', 'cardId')
      .addSelect('COUNT(*)', 'attempts')
      .addSelect("SUM(CASE WHEN attempt.grade IN ('good', 'easy') THEN 1 ELSE 0 END)", 'correct')
      .where('attempt.cardId IN (:...cardIds)', { cardIds })
      .andWhere('attempt.createdAt >= :since', { since })
      .groupBy('attempt.cardId')
      .getRawMany();

    const recentStats = new Map<number, { attempts: number; correct: number }>();
    for (const row of recentAttemptStatsRaw) {
      const cardId = Number(row.cardId);
      if (!Number.isFinite(cardId)) continue;
      recentStats.set(cardId, {
        attempts: Number(row.attempts || 0),
        correct: Number(row.correct || 0),
      });
    }

    const scored = cards.map((card) => {
      const dueTime = card.dueAt ? new Date(card.dueAt).getTime() : now.getTime();
      const overdueDays = Math.max(0, Math.floor((now.getTime() - dueTime) / (24 * 60 * 60 * 1000)));
      const isDue = dueTime <= now.getTime();
      const daysSinceReview = card.lastReviewedAt
        ? Math.max(0, Math.floor((now.getTime() - new Date(card.lastReviewedAt).getTime()) / (24 * 60 * 60 * 1000)))
        : lookbackDays;

      const recent = recentStats.get(card.id);
      const recentAccuracy = recent && recent.attempts > 0 ? (recent.correct / recent.attempts) * 100 : null;
      const historicalAccuracy =
        card.reviewCount > 0
          ? ((card.reviewCount - Math.min(card.reviewCount, card.lapseCount || 0)) / card.reviewCount) * 100
          : null;
      const baseline = recentAccuracy ?? historicalAccuracy ?? 40;
      const duePenalty = isDue ? Math.min(25, 8 + Math.ceil(overdueDays / 2)) : 0;
      const lapsePenalty = Math.min(20, (card.lapseCount || 0) * 2);
      const freshnessPenalty = Math.min(12, Math.floor(daysSinceReview / 10) * 3);
      const streakBonus = Math.min(12, (card.consecutiveCorrect || 0) * 2);
      const pct = Math.round(
        this.clamp(baseline - duePenalty - lapsePenalty - freshnessPenalty + streakBonus, 0, 100),
      );

      return {
        cardId: card.id,
        front: card.front,
        back: card.back,
        pct,
        due: isDue,
        dueAt: card.dueAt,
        lastReviewedAt: card.lastReviewedAt ?? null,
        reviewCount: card.reviewCount || 0,
      };
    });

    scored.sort((a, b) => {
      if (Number(b.due) !== Number(a.due)) return Number(b.due) - Number(a.due);
      if (a.pct !== b.pct) return a.pct - b.pct;
      const aDue = a.dueAt ? new Date(a.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
      const bDue = b.dueAt ? new Date(b.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
      if (aDue !== bDue) return aDue - bDue;
      return a.reviewCount - b.reviewCount;
    });

    return {
      rows: scored.slice(0, limit),
      dueCardCount,
      lookedBackDays: lookbackDays,
      generatedAt: now.toISOString(),
    };
  }

  async recordAttempt(clientId: string, cardId: number, dto: RecordAttemptDto) {
    const card = await this.cardRepo
      .createQueryBuilder('card')
      .innerJoinAndSelect('card.pack', 'pack')
      .where('card.id = :cardId', { cardId })
      .andWhere('pack.clientId = :clientId', { clientId })
      .getOne();

    if (!card) {
      throw new NotFoundException(`Card ${cardId} not found`);
    }

    const schedule = this.computeSchedule(card, dto.grade);

    card.easeFactor = schedule.nextEase;
    card.intervalDays = schedule.nextInterval;
    card.consecutiveCorrect = schedule.nextStreak;
    card.reviewCount = (card.reviewCount ?? 0) + 1;
    card.lapseCount = (card.lapseCount ?? 0) + schedule.lapseIncrement;
    card.lastReviewedAt = new Date();
    card.dueAt = schedule.dueAt;
    await this.cardRepo.save(card);

    const attempt = await this.attemptRepo.save(
      this.attemptRepo.create({
        cardId: card.id,
        grade: dto.grade,
        responseMs: dto.responseMs ?? null,
        reviewedAt: new Date(),
        previousEaseFactor: schedule.previousEase,
        nextEaseFactor: schedule.nextEase,
        previousIntervalDays: schedule.previousInterval,
        nextIntervalDays: schedule.nextInterval,
        nextDueAt: schedule.dueAt,
      }),
    );

    const totalDue = await this.cardRepo
      .createQueryBuilder('due')
      .innerJoin(FlashcardPack, 'pack', 'pack.id = due.packId')
      .where('pack.clientId = :clientId', { clientId })
      .andWhere('due.dueAt <= :now', { now: new Date() })
      .getCount();

    await this.emitLexiconInteractionFromAttempt(card, clientId, dto.grade);

    await this.emitFlashcardsEvent({
      type: 'flashcards.card.attempted',
      clientId,
      packId: card.packId,
      cardId: card.id,
      attemptId: attempt.id,
      grade: dto.grade,
      dueAt: card.dueAt.toISOString(),
      totalDue,
    });

    return {
      cardId: card.id,
      grade: dto.grade,
      nextDueAt: card.dueAt,
      easeFactor: card.easeFactor,
      intervalDays: card.intervalDays,
      reviewCount: card.reviewCount,
      lapseCount: card.lapseCount,
      attemptId: attempt.id,
      totalDue,
    };
  }

  async handleCommand(command: any) {
    switch (command?.action) {
      case 'create_pack':
        return this.createPackWithCards(command.clientId, command.data);
      case 'create_card':
        return this.createCard(command.clientId, command.packId, command.data);
      case 'record_attempt':
        return this.recordAttempt(command.clientId, command.cardId, command.data);
      default:
        this.logger.warn(`Unsupported flashcards command: ${JSON.stringify(command)}`);
        return;
    }
  }
}
