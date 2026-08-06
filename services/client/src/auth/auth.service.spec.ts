import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { User } from './entities/User';
import { MagicLink } from './entities/MagicLink';

describe('AuthService token auth', () => {
  let service: AuthService;
  const userRepo = {
    findOne: jest.fn(),
  };
  const magicLinkRepo = {
    createQueryBuilder: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: userRepo,
        },
        {
          provide: getRepositoryToken(MagicLink),
          useValue: magicLinkRepo,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, fallback?: string) => {
              const values: Record<string, string> = {
                RESEND_API_KEY: 're_test_key',
                AUTH_TOKEN_SECRET: 'unit-test-secret',
                SESSION_SECRET: 'unit-test-session-secret',
              };
              return values[key] ?? fallback;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  it('issues access and refresh token pair', () => {
    const user = {
      id: 1,
      email: 'user@example.com',
      clientId: 'client-1',
      role: 'learner',
      hasCompletedSignup: false,
    } as User;

    const result = service.issueTokenPair(user);
    expect(result.ok).toBe(true);
    expect(result.accessToken).toEqual(expect.any(String));
    expect(result.refreshToken).toEqual(expect.any(String));
    expect(result.expiresInSec).toBe(900);
  });

  it('refreshes token pair for valid refresh token', async () => {
    const user = {
      id: 2,
      email: 'user2@example.com',
      clientId: 'client-2',
      role: 'learner',
      hasCompletedSignup: true,
    } as User;
    const initial = service.issueTokenPair(user);
    userRepo.findOne.mockResolvedValue(user);

    const refreshed = await service.refreshTokenPair(initial.refreshToken);
    expect(userRepo.findOne).toHaveBeenCalledWith({
      where: { id: 2 },
    });
    expect(refreshed.ok).toBe(true);
    expect(refreshed.accessToken).toEqual(expect.any(String));
    expect(refreshed.refreshToken).toEqual(expect.any(String));
  });
});
