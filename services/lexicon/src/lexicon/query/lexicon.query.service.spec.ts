import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User, Word } from 'src/bank/bank.entity';
import { UserWordStatistics } from 'src/interaction/interaction.entity';
import { WordScoringService } from '../scoring.service';
import { LexiconQueryService } from './lexicon.query.service';
import { WordSnapshot } from './lexicon.query.types';

describe('LexiconQueryService', () => {
  let service: LexiconQueryService;
  let wordRepo: jest.Mocked<Repository<Word>>;
  let userRepo: jest.Mocked<Repository<User>>;
  let statsRepo: jest.Mocked<Repository<UserWordStatistics>>;
  let scoringService: jest.Mocked<WordScoringService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LexiconQueryService,
        {
          provide: getRepositoryToken(Word),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            createQueryBuilder: jest.fn(() => ({
              insert: jest.fn().mockReturnThis(),
              into: jest.fn().mockReturnThis(),
              values: jest.fn().mockReturnThis(),
              orIgnore: jest.fn().mockReturnThis(),
              execute: jest.fn(),
            })),
            findOneOrFail: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UserWordStatistics),
          useValue: {
            find: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: WordScoringService,
          useValue: {
            decayScore: jest.fn().mockImplementation((score: number) => score),
          },
        },
      ],
    }).compile();

    service = module.get(LexiconQueryService);
    wordRepo = module.get(getRepositoryToken(Word));
    userRepo = module.get(getRepositoryToken(User));
    statsRepo = module.get(getRepositoryToken(UserWordStatistics));
    scoringService = module.get(WordScoringService);

    statsRepo.find.mockResolvedValue([]);
  });

  describe('getUserWordSnapshot', () => {
    it('returns empty array when no stats exist', async () => {
      userRepo.findOneOrFail.mockResolvedValue({
        id: 123,
        clientId: 'client-1',
      } as User);

      const result = await service.getUserWordSnapshot('client-1', 'en');

      expect(result).toEqual([]);
      expect(statsRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            user: { id: 123 },
            word: { language: 'en' },
          },
          relations: ['word'],
        }),
      );
    });

    it('returns ranked word snapshots with decay applied from lastSeenAt', async () => {
      const now = Date.now();

      userRepo.findOneOrFail.mockResolvedValue({
        id: 123,
        clientId: 'client-1',
      } as User);

      wordRepo.find.mockResolvedValue([
        {
          id: 1,
          word: 'run',
          lemma: 'run',
          pos: 'verb',
          language: 'en',
        } as Word,
        {
          id: 2,
          word: 'fast',
          lemma: 'fast',
          pos: 'adj',
          language: 'en',
        } as Word,
      ]);

      statsRepo.find.mockResolvedValue([
        {
          id: 1,
          word: { id: 1 } as any,
          score: 10,
          lastUpdated: new Date(),
          lastSeenAt: new Date(now - 1 * 24 * 60 * 60 * 1000),
        } as any,
        {
          id: 2,
          word: { id: 2 } as any,
          score: 5,
          lastUpdated: new Date(),
          lastSeenAt: new Date(now - 10 * 24 * 60 * 60 * 1000),
        } as any,
      ]);

      const result = await service.getUserWordSnapshot('client-1', 'en');

      expect(result.length).toBe(2);
      expect(result[0].stats.score).toBeGreaterThan(result[1].stats.score);
      expect(result).toEqual(
        expect.arrayContaining<WordSnapshot>([
          expect.objectContaining({
            word: 'run',
            stats: expect.objectContaining({
              rawScore: 10,
              lastSeenAt: expect.any(String),
            }),
          }),
          expect.objectContaining({
            word: 'fast',
            stats: expect.objectContaining({
              rawScore: 5,
              lastSeenAt: expect.any(String),
            }),
          }),
        ]),
      );
    });

    it('skips words missing from the database', async () => {
      userRepo.findOneOrFail.mockResolvedValue({
        id: 123,
        clientId: 'client-1',
      } as User);

      wordRepo.find.mockResolvedValue([
        {
          id: 1,
          word: 'run',
          lemma: 'run',
          pos: 'verb',
          language: 'en',
        } as Word,
      ]);

      statsRepo.find.mockResolvedValue([
        {
          id: 1,
          word: { id: 1 } as any,
          score: 10,
          lastUpdated: new Date(),
        } as any,
        {
          id: 2,
          word: { id: 999 } as any,
          score: 50,
          lastUpdated: new Date(),
        } as any,
      ]);

      const result = await service.getUserWordSnapshot('client-1', 'en');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });

    it('persists score decay when it changes materially', async () => {
      userRepo.findOneOrFail.mockResolvedValue({
        id: 123,
        clientId: 'client-1',
      } as User);
      wordRepo.find.mockResolvedValue([
        {
          id: 1,
          word: 'run',
          lemma: 'run',
          pos: 'verb',
          language: 'en',
        } as Word,
      ]);
      statsRepo.find.mockResolvedValue([
        {
          id: 1,
          word: { id: 1 } as any,
          score: 10,
          lastUpdated: new Date('2026-01-01T00:00:00.000Z'),
          lastSeenAt: new Date('2026-01-01T00:00:00.000Z'),
        } as any,
      ]);
      scoringService.decayScore.mockReturnValue(7.5);

      await service.getUserWordSnapshot('client-1', 'en');

      expect(statsRepo.save).toHaveBeenCalledWith([
        expect.objectContaining({
          id: 1,
          score: 7.5,
          lastUpdated: expect.any(Date),
        }),
      ]);
    });
  });
});
