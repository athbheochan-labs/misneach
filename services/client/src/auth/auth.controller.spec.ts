import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User } from './entities/User';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  const mockResponse = () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.clearCookie = jest.fn().mockReturnValue(res);
    return res;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            handleMagicLink: jest.fn(),
            issueTokenPairFromMagicLink: jest.fn(),
            refreshTokenPair: jest.fn(),
            getUserFromAccessToken: jest.fn(),
            getUserFromSession: jest.fn(),
            verifyMagicLink: jest.fn(),
            verifyMagicLinkToken: jest.fn(),
            toPublicUser: jest.fn((user: User) => ({
              id: user.id,
              email: user.email,
              clientId: user.clientId,
              role: user.role,
              signupComplete: user.hasCompletedSignup,
              displayName: user.displayName,
              avatarUrl: user.avatarUrl,
              dailyReminderEnabled: user.dailyReminderEnabled,
              dailyReminderTime: user.dailyReminderTime,
              createdAt: user.createdAt,
            })),
            updateProfile: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  it('returns pending_verification on login initiation', async () => {
    const res = mockResponse();

    await controller.login({ email: 'test@example.com' }, { headers: {} } as any, res);

    expect(authService.handleMagicLink).toHaveBeenCalledWith('test@example.com', undefined);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: true,
        status: 'pending_verification',
      }),
    );
  });

  it('returns token pair on login token exchange', async () => {
    const res = mockResponse();
    authService.issueTokenPairFromMagicLink.mockResolvedValue({
      ok: true,
      accessToken: 'a',
      refreshToken: 'r',
      expiresInSec: 900,
      user: {
        id: 1,
        email: 'test@example.com',
        clientId: 'cid',
        role: 'learner',
        signupComplete: false,
      },
    } as any);

    await controller.login({ email: 'test@example.com', token: 'abc' }, { headers: {} } as any, res);

    expect(authService.issueTokenPairFromMagicLink).toHaveBeenCalledWith('test@example.com', 'abc');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ ok: true, accessToken: 'a' }));
  });

  it('requires refresh token', async () => {
    const res = mockResponse();
    await controller.refresh({ refreshToken: '' }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('supports bearer token in /auth/me', async () => {
    const user = {
      id: 9,
      email: 'test@example.com',
      clientId: 'cid',
      role: 'learner',
      hasCompletedSignup: true,
    } as User;
    authService.getUserFromAccessToken.mockResolvedValue(user);

    const result = await controller.getMe({
      headers: { authorization: 'Bearer token' },
    } as any);

    expect(authService.getUserFromAccessToken).toHaveBeenCalledWith('token');
    expect(result).toEqual(
      expect.objectContaining({
        loggedIn: true,
        user: expect.objectContaining({ id: 9, clientId: 'cid' }),
      }),
    );
  });
});
