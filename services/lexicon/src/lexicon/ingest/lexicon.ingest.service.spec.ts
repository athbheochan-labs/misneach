import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getConnectionToken, getRepositoryToken } from '@nestjs/typeorm';
import { Connection, Repository } from 'typeorm';

import { User, Word, WordForm } from 'src/bank/bank.entity';
import { InteractionService } from 'src/interaction/interaction.service';
import { StatementService } from 'src/statement/statement.service';
import { LexiconProfileService } from '../profile.service';
import { LexiconIngestService } from './lexicon.ingest.service';
import { NlpCompleteEvent } from './lexicon.ingest.types';

function createMockRepo<T>() {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  } as unknown as jest.Mocked<Repository<T>>;
}

describe('LexiconIngestService', () => {
  let service: LexiconIngestService;
  let userRepo: jest.Mocked<Repository<User>>;
  let wordRepo: jest.Mocked<Repository<Word>>;
  let wordFormRepo: jest.Mocked<Repository<WordForm>>;
  let profileService: jest.Mocked<LexiconProfileService>;
  let interactionService: jest.Mocked<InteractionService>;
  let statementService: jest.Mocked<StatementService>;

  beforeEach(async () => {
    userRepo = createMockRepo<User>();
    wordRepo = createMockRepo<Word>();
    wordFormRepo = createMockRepo<WordForm>();

    wordFormRepo.createQueryBuilder = jest.fn().mockReturnValue({
      insert: jest.fn().mockReturnThis(),
      into: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      orIgnore: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue(undefined),
    });

    profileService = {
      addOrUpdateUserWordScore: jest.fn(),
      markWordSeen: jest.fn(),
      getUserTopWords: jest.fn(),
      getUserWordSeen: jest.fn(),
    } as unknown as jest.Mocked<LexiconProfileService>;

    interactionService = {
      createInteraction: jest.fn(),
    } as unknown as jest.Mocked<InteractionService>;

    statementService = {
      getOrCreate: jest.fn().mockImplementation(async (input) => ({
        id: 1,
        ...input,
      })),
      save: jest.fn().mockImplementation(async (input) => input),
      createTokens: jest.fn().mockResolvedValue(undefined),
      clearTokens: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn().mockImplementation(async (id: number) => ({
        id,
        tokens: [],
      })),
    } as unknown as jest.Mocked<StatementService>;

    const connectionMock = {
      createQueryBuilder: jest.fn().mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        into: jest.fn().mockReturnThis(),
        values: jest.fn().mockReturnThis(),
        orIgnore: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue(undefined),
      }),
    } as unknown as Connection;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LexiconIngestService,
        Logger,
        { provide: getConnectionToken(), useValue: connectionMock },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(Word), useValue: wordRepo },
        { provide: getRepositoryToken(WordForm), useValue: wordFormRepo },
        { provide: LexiconProfileService, useValue: profileService },
        { provide: InteractionService, useValue: interactionService },
        { provide: StatementService, useValue: statementService },
      ],
    }).compile();

    service = module.get(LexiconIngestService);
  });

  describe('ingestFromEvent', () => {
    it('ingests tokens and applies profile side effects', async () => {
      const user = { id: 1, clientId: 'client-1' } as User;
      const word = { id: 10, lemma: 'run', pos: 'verb' } as Word;
      const wordForm = { id: 100, form: 'running', word } as WordForm;

      const event: NlpCompleteEvent = {
        clientId: 'client-1',
        language: 'en',
        interaction: { type: 'lexicon_import' },
        sentences: [
          {
            sentenceId: 's-1',
            text: 'I am running',
            tokens: [{ surface: 'running', lemma: 'run', pos: 'verb' }],
          },
        ],
      };

      userRepo.findOne.mockResolvedValue(user);
      wordRepo.find.mockResolvedValue([word]);
      wordFormRepo.find.mockResolvedValue([wordForm]);

      await service.ingestFromEvent(event);

      expect(profileService.addOrUpdateUserWordScore).toHaveBeenCalled();
      expect(profileService.markWordSeen).toHaveBeenCalledWith(
        'client-1',
        'en',
        word.id,
      );
      expect(interactionService.createInteraction).toHaveBeenCalledWith(
        'client-1',
        wordForm.id,
        'lexicon_import',
        undefined,
      );
    });

    it('creates a user if one does not exist', async () => {
      const user = { id: 1, clientId: 'client-1' } as User;

      userRepo.findOne.mockResolvedValue(null);
      userRepo.create.mockReturnValue(user);
      userRepo.save.mockResolvedValue(user);

      wordRepo.find.mockResolvedValue([]);
      wordFormRepo.find.mockResolvedValue([]);

      const event: NlpCompleteEvent = {
        clientId: 'client-1',
        language: 'en',
        sentences: [],
      };

      await service.ingestFromEvent(event);

      expect(userRepo.create).toHaveBeenCalledWith({ clientId: 'client-1' });
      expect(userRepo.save).toHaveBeenCalled();
    });
  });
});
