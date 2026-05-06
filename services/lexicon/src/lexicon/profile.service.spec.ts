import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User, Word } from 'src/bank/bank.entity';
import { UserWordStatistics } from 'src/interaction/interaction.entity';
import { LexiconProfileService } from './profile.service';

function createMockRepo<T>() {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  } as unknown as jest.Mocked<Repository<T>>;
}

describe('LexiconProfileService', () => {
  let service: LexiconProfileService;
  let userRepo: jest.Mocked<Repository<User>>;
  let wordRepo: jest.Mocked<Repository<Word>>;
  let statsRepo: jest.Mocked<Repository<UserWordStatistics>>;

  beforeEach(async () => {
    userRepo = createMockRepo<User>();
    wordRepo = createMockRepo<Word>();
    statsRepo = createMockRepo<UserWordStatistics>();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LexiconProfileService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(Word), useValue: wordRepo },
        {
          provide: getRepositoryToken(UserWordStatistics),
          useValue: statsRepo,
        },
      ],
    }).compile();

    service = module.get(LexiconProfileService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('addOrUpdateUserWordScore', () => {
    it('increments priority score on an existing stats record', async () => {
      userRepo.findOne.mockResolvedValue({ id: 1, clientId: 'user1' } as User);
      wordRepo.findOne.mockResolvedValue({ id: 42, language: 'ga' } as Word);
      statsRepo.findOne.mockResolvedValue({
        id: 7,
        priorityScore: 1.5,
        user: { id: 1 },
        word: { id: 42 },
      } as any);

      await service.addOrUpdateUserWordScore('user1', 'ga', 42, 1.25);

      expect(statsRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ priorityScore: 2.75 }),
      );
    });

    it('creates a stats record when one does not exist', async () => {
      const user = { id: 1, clientId: 'user1' } as User;
      const word = { id: 42, language: 'ga' } as Word;
      const created = {
        user,
        word,
        priorityScore: 0,
        lastSeenAt: null,
      } as UserWordStatistics;

      userRepo.findOne.mockResolvedValue(user);
      wordRepo.findOne.mockResolvedValue(word);
      statsRepo.findOne.mockResolvedValue(null);
      statsRepo.create.mockReturnValue(created);

      await service.addOrUpdateUserWordScore('user1', 'ga', 42, 0.5);

      expect(statsRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user,
          word,
          priorityScore: 0,
          lastSeenAt: null,
        }),
      );
      expect(statsRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ priorityScore: 0.5 }),
      );
    });

    it('does not write if scoreDelta is invalid', async () => {
      await service.addOrUpdateUserWordScore('user1', 'ga', 42, Number.NaN);
      expect(statsRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('getUserTopWords', () => {
    it('returns ranked word snapshots from persistent stats', async () => {
      userRepo.findOne.mockResolvedValue({ id: 1, clientId: 'user1' } as User);
      statsRepo.find.mockResolvedValue([
        { word: { id: 10 }, priorityScore: 2.5 } as any,
        { word: { id: 20 }, priorityScore: 1.0 } as any,
      ]);

      const result = await service.getUserTopWords('user1', 'ga', 10);

      expect(statsRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            user: { id: 1 },
            word: { language: 'ga' },
          },
          order: { priorityScore: 'DESC', id: 'ASC' },
          take: 10,
        }),
      );
      expect(result).toEqual([
        { wordId: 10, score: 2.5 },
        { wordId: 20, score: 1.0 },
      ]);
    });
  });

  describe('markWordSeen', () => {
    it('stores a last-seen timestamp on the stats record', async () => {
      const user = { id: 1, clientId: 'user1' } as User;
      const word = { id: 5, language: 'ga' } as Word;
      const stats = {
        id: 2,
        user,
        word,
        priorityScore: 0,
        lastSeenAt: null,
      } as UserWordStatistics;

      userRepo.findOne.mockResolvedValue(user);
      wordRepo.findOne.mockResolvedValue(word);
      statsRepo.findOne.mockResolvedValue(stats);

      await service.markWordSeen('user1', 'ga', 5);

      expect(statsRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          lastSeenAt: expect.any(Date),
        }),
      );
    });
  });

  describe('getUserWordSeen', () => {
    it('returns a map of persisted timestamps', async () => {
      userRepo.findOne.mockResolvedValue({ id: 1, clientId: 'user1' } as User);
      statsRepo.find.mockResolvedValue([
        {
          word: { id: 1 },
          lastSeenAt: new Date('2026-01-01T00:00:00.000Z'),
        } as any,
        {
          word: { id: 3 },
          lastSeenAt: new Date('2026-01-03T00:00:00.000Z'),
        } as any,
      ]);

      const result = await service.getUserWordSeen('user1', 'ga', [1, 2, 3]);

      expect(result.get(1)).toBe(new Date('2026-01-01T00:00:00.000Z').getTime());
      expect(result.has(2)).toBe(false);
      expect(result.get(3)).toBe(new Date('2026-01-03T00:00:00.000Z').getTime());
    });
  });
});
