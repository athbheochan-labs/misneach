import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpStatus,
  Logger,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { Response } from 'express';
import { AUTH_COOKIE } from './auth.constants';
import { AuthService } from './auth.service';
import { AuthenticatedRequest } from './types/request';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
  ) { }

  private assertInternalRequest(req: AuthenticatedRequest) {
    const provided = req.headers['x-internal-auth'];
    const expected = process.env.INTERNAL_AUTH_SECRET;

    if (!expected) {
      if (process.env.NODE_ENV === 'production') {
        throw new ForbiddenException('Forbidden');
      }
      return;
    }

    if (provided !== expected) {
      throw new ForbiddenException('Forbidden');
    }
  }

  /**
   * Sends a magic login link to the given email address.
   */
  @Post('magic-link')
  async sendMagicLink(
    @Body() body: { email: string },
    @Res() res: Response,
  ) {
    this.logger.log(`Magic link requested for ${body.email}`);

    try {
      const result = await this.authService.handleMagicLink(body.email);
      return res.status(HttpStatus.OK).json(result);
    } catch (err) {
      this.logger.error(
        `Magic link failed for ${body.email}`,
        err.stack,
      );
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json({ error: err.message });
    }
  }

  /**
   * Mobile-friendly login flow:
   * - `{ email }` -> send magic link (pending verification)
   * - `{ email, token }` -> verify token and issue access/refresh pair
   */
  @Post('login')
  async login(
    @Body() body: { email: string; token?: string },
    @Res() res: Response,
  ) {
    const email = String(body?.email || '').trim().toLowerCase();
    const token = String(body?.token || '').trim();

    if (!email) {
      return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Email is required' });
    }

    if (!token) {
      await this.authService.handleMagicLink(email);
      return res.status(HttpStatus.OK).json({
        ok: true,
        status: 'pending_verification',
        message: 'Login link sent if account is eligible',
      });
    }

    const tokenPair = await this.authService.issueTokenPairFromMagicLink(email, token);
    return res.status(HttpStatus.OK).json(tokenPair);
  }

  @Post('refresh')
  async refresh(@Body() body: { refreshToken: string }, @Res() res: Response) {
    const refreshToken = String(body?.refreshToken || '').trim();
    if (!refreshToken) {
      return res.status(HttpStatus.BAD_REQUEST).json({ error: 'refreshToken is required' });
    }

    try {
      const tokenPair = await this.authService.refreshTokenPair(refreshToken);
      return res.status(HttpStatus.OK).json(tokenPair);
    } catch (err) {
      if (err instanceof UnauthorizedException) {
        return res.status(HttpStatus.UNAUTHORIZED).json({ error: err.message });
      }
      throw err;
    }
  }

  /**
   * Verifies a magic login link and establishes a session.
   */
  @Get('verify-request')
  async verifyMagicLink(
    @Query('token') token: string,
    @Query('email') email: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    this.logger.log(`Verifying magic link for ${email}`);

    try {
      const user = await this.authService.verifyMagicLink(
        token,
        email,
        res,
      );

      if (req.session) {
        req.session.user = {
          id: user.id,
          clientId: user.clientId,
          email: user.email,
          role: user.role,
        };
      }

      this.logger.log(`Session established for user=${user.id}`);

      await this.authService.ensureDefaultLanguageSettings(user);

      return res.redirect('/dashboard');
    } catch (err) {
      this.logger.error(
        `Magic link verification failed for ${email}`,
        err.stack,
      );
      return res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ error: 'Server error' });
    }
  }

  /**
   * Internal endpoint for SvelteKit to validate magic-link tokens without
   * setting a Nest session cookie.
   */
  @Post('verify-token')
  async verifyToken(
    @Body() body: { token: string; email: string },
    @Req() req: AuthenticatedRequest,
  ) {
    const trustedInternal = process.env.AUTH_TRUSTED_HEADERS_ENABLED === 'true';
    if (trustedInternal) {
      const internalSecret = req.headers['x-internal-auth'];
      if (internalSecret !== process.env.INTERNAL_AUTH_SECRET) {
        throw new ForbiddenException('Forbidden');
      }
    }

    const user = await this.authService.verifyMagicLinkToken(
      body.token,
      body.email,
    );
    return {
        user: {
          id: user.id,
          email: user.email,
          clientId: user.clientId,
          role: user.role,
          signupComplete: user.hasCompletedSignup,
        },
      };
  }

  @Post('internal/resolve-email')
  async resolveEmail(
    @Body() body: { email: string },
    @Req() req: AuthenticatedRequest,
  ) {
    this.assertInternalRequest(req);

    const user = await this.authService.ensureUserByEmail(String(body?.email || ''));
    return {
      user: {
        id: user.id,
        email: user.email,
        clientId: user.clientId,
        role: user.role,
        signupComplete: user.hasCompletedSignup,
      },
    };
  }

  @Post('internal/mark-signup-complete')
  async markSignupComplete(
    @Body() body: { userId: number },
    @Req() req: AuthenticatedRequest,
  ) {
    this.assertInternalRequest(req);

    const user = await this.authService.markSignupCompleteByUserId(Number(body?.userId || 0));
    return {
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        clientId: user.clientId,
        role: user.role,
        signupComplete: user.hasCompletedSignup,
      },
    };
  }

  /**
   * Returns current authenticated user (used by Alpine).
   */
  @Get('me')
  async getMe(@Req() req: AuthenticatedRequest) {
    const authHeader = req.headers.authorization;
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      try {
        const user = await this.authService.getUserFromAccessToken(token);
        return {
          loggedIn: true,
          user: {
            id: user.id,
            clientId: user.clientId,
            email: user.email,
            role: user.role,
            signupComplete: user.hasCompletedSignup,
          },
        };
      } catch {
        return { loggedIn: false, user: null };
      }
    }

    try {
      const user = await this.authService.getUserFromSession(req);
      return {
        loggedIn: true,
        user: {
          id: user.id,
          clientId: user.clientId,
          email: user.email,
          role: user.role,
          signupComplete: user.hasCompletedSignup,
        },
      };
    } catch {
      return { loggedIn: false, user: null };
    }
  }

  /**
   * Logs the user out and clears the session.
   */
  @Post('logout')
  logout(@Body() _body: { refreshToken?: string }, @Res() res: Response) {
    res.clearCookie(AUTH_COOKIE, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    return res.status(200).json({ ok: true });
  }
}
