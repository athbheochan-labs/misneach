import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User, Word } from 'src/bank/bank.entity';
import { UserWordStatistics } from 'src/interaction/interaction.entity';
import { In, Repository } from 'typeorm';

@Injectable()
export class LexiconProfileService {
  private readonly logger = new Logger(LexiconProfileService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Word)
    private readonly wordRepository: Repository<Word>,
    @InjectRepository(UserWordStatistics)
    private readonly statsRepository: Repository<UserWordStatistics>,
  ) { }

  async addOrUpdateUserWordScore(
    clientId: string,
    language: string,
    wordId: number,
    scoreDelta: number,
  ) {
    if (!clientId || !language) {
      this.logger.warn(
        'Missing clientId or language in addOrUpdateUserWordScore',
        { clientId, language, wordId, scoreDelta },
      );
      return;
    }

    if (!Number.isFinite(scoreDelta)) {
      this.logger.warn('Invalid scoreDelta', {
        clientId,
        language,
        wordId,
        scoreDelta,
      });
      return;
    }

    const stats = await this.getOrCreateStats(clientId, wordId, language);
    if (!stats) {
      return;
    }

    stats.priorityScore = Number((stats.priorityScore + scoreDelta).toFixed(4));
    await this.statsRepository.save(stats);
  }

  async getUserTopWords(
    clientId: string,
    language: string,
    limit = 1000,
  ): Promise<{ wordId: number; score: number }[]> {
    const user = await this.userRepository.findOne({ where: { clientId } });
    if (!user) {
      return [];
    }

    const stats = await this.statsRepository.find({
      where: {
        user: { id: user.id },
        word: { language },
      },
      relations: ['word'],
      order: { priorityScore: 'DESC', id: 'ASC' },
      take: limit,
    });

    return stats
      .filter((stat) => stat.word?.id != null)
      .map((stat) => ({
        wordId: stat.word.id,
        score: stat.priorityScore ?? 0,
      }));
  }

  async markWordSeen(clientId: string, language: string, wordId: number) {
    if (!clientId || !language || !Number.isInteger(wordId) || wordId <= 0) {
      this.logger.warn('Invalid input to markWordSeen', {
        clientId,
        language,
        wordId,
      });
      return;
    }

    const stats = await this.getOrCreateStats(clientId, wordId, language);
    if (!stats) {
      return;
    }

    stats.lastSeenAt = new Date();
    await this.statsRepository.save(stats);
  }

  async getUserWordSeen(
    clientId: string,
    language: string,
    wordIds: number[],
  ): Promise<Map<number, number>> {
    if (!wordIds.length) {
      return new Map();
    }

    const user = await this.userRepository.findOne({ where: { clientId } });
    if (!user) {
      return new Map();
    }

    const stats = await this.statsRepository.find({
      where: {
        user: { id: user.id },
        word: {
          id: In(wordIds),
          language,
        },
      },
      relations: ['word'],
    });

    const seenMap = new Map<number, number>();

    for (const stat of stats) {
      if (stat.word?.id != null && stat.lastSeenAt) {
        seenMap.set(stat.word.id, stat.lastSeenAt.getTime());
      }
    }

    return seenMap;
  }

  private async getOrCreateStats(
    clientId: string,
    wordId: number,
    language: string,
  ): Promise<UserWordStatistics | null> {
    if (!Number.isInteger(wordId) || wordId <= 0) {
      this.logger.warn('Invalid wordId passed to profile service', {
        clientId,
        language,
        wordId,
      });
      return null;
    }

    const user = await this.getOrCreateUser(clientId);
    const word = await this.wordRepository.findOne({
      where: { id: wordId, language },
    });

    if (!word) {
      this.logger.warn('Word not found for profile update', {
        clientId,
        language,
        wordId,
      });
      return null;
    }

    let stats = await this.statsRepository.findOne({
      where: {
        user: { id: user.id },
        word: { id: wordId },
      },
      relations: ['word'],
    });

    if (!stats) {
      stats = this.statsRepository.create({
        user,
        word,
        lastSeenAt: null,
        priorityScore: 0,
      });
    }

    return stats;
  }

  private async getOrCreateUser(clientId: string): Promise<User> {
    let user = await this.userRepository.findOne({ where: { clientId } });
    if (user) {
      return user;
    }

    user = this.userRepository.create({ clientId });
    return this.userRepository.save(user);
  }
}
