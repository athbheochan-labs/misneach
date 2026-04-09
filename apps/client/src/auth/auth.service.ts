import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { Response } from 'express';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { Resend } from 'resend';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { SettingsService } from 'src/settings/settings.service';
import { MagicLink } from './entities/MagicLink';
import { User } from './entities/User';
import { AuthenticatedRequest } from './types/request';

// TODO: Read these from the i18n service
const translations = {
  en: {
    subject: 'Your Magic Login Link',
    greeting: 'Welcome to Misneach!',
    intro: 'Click the button below to access your account securely.',
    button: 'Login Now',
    note: 'If you didn’t request this link, you can safely ignore this email.',
    footer: '© 2025 Misneach. All rights reserved.',
  },
  ga: {
    subject: 'Do Nasc Draíochta Logála Isteach',
    greeting: 'Fáilte go Misneach!',
    intro: 'Cliceáil an cnaipe thíos chun rochtain shlán a fháil ar do chuntas.',
    button: 'Logáil Isteach Anois',
    note: 'Mura ndearna tú iarratas ar an nasc seo, is féidir leat neamhaird a dhéanamh de.',
    footer: '© 2025 Misneach. Gach ceart ar cosaint.',
  },
  pt: {
    subject: 'Seu Link Mágico de Login',
    greeting: 'Bem-vindo ao Misneach!',
    intro: 'Clique no botão abaixo para acessar sua conta com segurança.',
    button: 'Entrar Agora',
    note: 'Se você não solicitou este link, pode ignorar este e-mail com segurança.',
    footer: '© 2025 Misneach. Todos os direitos reservados.',
  },
};

@Injectable()
export class AuthService {
  private resend;
  private readonly accessTokenTtlSec = 15 * 60;
  private readonly refreshTokenTtlSec = 30 * 24 * 60 * 60;
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(MagicLink)
    private readonly magicLinkRepo: Repository<MagicLink>,

    private readonly config: ConfigService,
    private readonly settingsService: SettingsService,
  ) {
    this.resend = new Resend(this.config.get<string>('RESEND_API_KEY'));
  }

  private getTokenSecret(): string {
    return (
      this.config.get<string>('AUTH_TOKEN_SECRET') ||
      this.config.get<string>('SESSION_SECRET') ||
      'dev-insecure-auth-token-secret'
    );
  }

  private base64UrlEncode(input: Buffer | string): string {
    const value = Buffer.isBuffer(input) ? input.toString('base64') : Buffer.from(input).toString('base64');
    return value.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  private base64UrlDecode(input: string): string {
    const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return Buffer.from(padded, 'base64').toString('utf8');
  }

  private signJwt(payload: Record<string, unknown>): string {
    const header = { alg: 'HS256', typ: 'JWT' };
    const headerEncoded = this.base64UrlEncode(JSON.stringify(header));
    const payloadEncoded = this.base64UrlEncode(JSON.stringify(payload));
    const data = `${headerEncoded}.${payloadEncoded}`;
    const signature = crypto
      .createHmac('sha256', this.getTokenSecret())
      .update(data)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
    return `${data}.${signature}`;
  }

  private verifyJwt(token: string): Record<string, unknown> {
    const [headerEncoded, payloadEncoded, signature] = token.split('.');
    if (!headerEncoded || !payloadEncoded || !signature) {
      throw new UnauthorizedException('Invalid token');
    }

    const data = `${headerEncoded}.${payloadEncoded}`;
    const expectedSig = crypto
      .createHmac('sha256', this.getTokenSecret())
      .update(data)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');

    if (expectedSig !== signature) {
      throw new UnauthorizedException('Invalid token');
    }

    const payloadRaw = this.base64UrlDecode(payloadEncoded);
    const payload = JSON.parse(payloadRaw) as Record<string, unknown>;
    const exp = Number(payload.exp || 0);
    if (!Number.isFinite(exp) || exp <= Math.floor(Date.now() / 1000)) {
      throw new UnauthorizedException('Token expired');
    }
    return payload;
  }

  private buildTokenPayload(user: User, tokenType: 'access' | 'refresh', ttlSec: number) {
    const nowSec = Math.floor(Date.now() / 1000);
    return {
      sub: String(user.id),
      clientId: user.clientId,
      email: user.email,
      role: user.role,
      signupComplete: user.hasCompletedSignup,
      tokenType,
      iat: nowSec,
      exp: nowSec + ttlSec,
    };
  }

  issueTokenPair(user: User) {
    const accessPayload = this.buildTokenPayload(user, 'access', this.accessTokenTtlSec);
    const refreshPayload = this.buildTokenPayload(user, 'refresh', this.refreshTokenTtlSec);

    return {
      ok: true as const,
      accessToken: this.signJwt(accessPayload),
      refreshToken: this.signJwt(refreshPayload),
      expiresInSec: this.accessTokenTtlSec,
      user: {
        id: user.id,
        email: user.email,
        clientId: user.clientId,
        role: user.role,
        signupComplete: user.hasCompletedSignup,
      },
    };
  }

  async issueTokenPairFromMagicLink(email: string, token: string) {
    const user = await this.verifyMagicLinkToken(token, email);
    return this.issueTokenPair(user);
  }

  async refreshTokenPair(refreshToken: string) {
    if (!refreshToken) {
      throw new BadRequestException('refreshToken is required');
    }

    const payload = this.verifyJwt(refreshToken);
    if (payload.tokenType !== 'refresh') {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const userId = Number(payload.sub || 0);
    if (!Number.isFinite(userId) || userId <= 0) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['languageSettings'],
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.issueTokenPair(user);
  }

  async getUserFromAccessToken(token: string): Promise<User> {
    if (!token) {
      throw new UnauthorizedException('Missing access token');
    }

    const payload = this.verifyJwt(token);
    if (payload.tokenType !== 'access') {
      throw new UnauthorizedException('Invalid access token');
    }

    const userId = Number(payload.sub || 0);
    if (!Number.isFinite(userId) || userId <= 0) {
      throw new UnauthorizedException('Invalid access token');
    }

    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['languageSettings'],
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }

  private getHeader(req: AuthenticatedRequest, key: string): string | undefined {
    const value = req.headers[key];
    if (typeof value === 'string') return value;
    if (Array.isArray(value) && value.length > 0) return value[0];
    return undefined;
  }

  private parseHeaderUserId(req: AuthenticatedRequest): number | null {
    const raw = this.getHeader(req, 'x-user-id');
    if (!raw) return null;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private resolveHeaderAuth(req: AuthenticatedRequest) {
    const clientId = this.getHeader(req, 'x-client-id');
    const userId = this.parseHeaderUserId(req);
    const roleHeader = this.getHeader(req, 'x-user-role');
    const role =
      roleHeader === 'admin' || roleHeader === 'learner' ? roleHeader : undefined;

    if (!clientId && !userId) return null;

    return {
      clientId: clientId ?? null,
      userId,
      sessionId: this.getHeader(req, 'x-session-id'),
      email: this.getHeader(req, 'x-user-email'),
      role,
    };
  }

  async ensureDefaultLanguageSettings(user: User): Promise<void> {
    const settings = await this.settingsService.getUserLanguageSettings(user.id);
    if (settings.length > 0) return;
    await this.settingsService.createUserLanguageSetting(
      user,
      'en',
      'ga',
      'normal',
    );
  }

  async handleMagicLink(email: string): Promise<{ message: string }> {
    if (!email) {
      throw new Error('Email is required');
    }

    let user = await this.userRepo.findOne({ where: { email } });
    if (!user) {
      user = this.userRepo.create({
        email,
        clientId: uuidv4(),
        role: 'learner',
        hasCompletedSignup: false,
      });
      await this.userRepo.save(user);
    } else if (!user.clientId) {
      user.clientId = uuidv4();
      await this.userRepo.save(user);
    }

    const token = crypto.randomBytes(32).toString('hex');
    const hashedToken = await bcrypt.hash(token, 10);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const magicLink = this.magicLinkRepo.create({
      user,
      token: hashedToken,
      expiresAt,
    });
    await this.magicLinkRepo.save(magicLink);

    const appUrl = this.config.get<string>('APP_URL');
    const verifyUrl = `${appUrl}/auth/verify-request?token=${token}&email=${email}`;

    const userLang = user.languageSettings?.[0]?.firstLanguage || 'en';
    const selectedTranslations = translations[userLang] || translations.en;

    const emailTemplatePath = join(__dirname, '..', '..', 'public', 'email', 'magic-link.html');
    let emailHtml = await readFile(emailTemplatePath, 'utf-8');

    emailHtml = emailHtml
      .replace(/{{verifyUrl}}/g, verifyUrl)
      .replace(/{{t\.subject}}/g, selectedTranslations.subject)
      .replace(/{{t\.greeting}}/g, selectedTranslations.greeting)
      .replace(/{{t\.intro}}/g, selectedTranslations.intro)
      .replace(/{{t\.button}}/g, selectedTranslations.button)
      .replace(/{{t\.note}}/g, selectedTranslations.note)
      .replace(/{{t\.footer}}/g, selectedTranslations.footer);

    const deliveryMode = this.config.get<string>('EMAIL_DELIVERY', 'send');

    if (deliveryMode === 'log') {
      // Clear, grep-friendly logs
      console.log('—— MAGIC LINK (EMAIL DELIVERY DISABLED) ——');
      console.log('To:', email);
      console.log('Verify URL:', verifyUrl);
      console.log('———————————————');

      return {
        message: 'Magic link generated (email delivery disabled)',
      };
    }

    await this.resend.emails.send({
      from: this.config.get<string>('EMAIL_FROM'),
      to: email,
      subject: selectedTranslations.subject,
      html: emailHtml,
    });

    return { message: 'Magic link sent!' };
  }

  async verifyMagicLinkToken(token: string, email: string): Promise<User> {
    if (!token || !email) {
      throw new BadRequestException('Invalid request');
    }

    const magicLink = await this.magicLinkRepo
      .createQueryBuilder('magicLink')
      .leftJoinAndSelect('magicLink.user', 'user')
      .where('user.email = :email', { email })
      .orderBy('magicLink.createdAt', 'DESC')
      .getOne();

    if (!magicLink) throw new NotFoundException('Token not found');

    if (new Date(magicLink.expiresAt) < new Date()) {
      throw new UnauthorizedException('Token expired');
    }

    const isValid = await bcrypt.compare(token, magicLink.token);
    if (!isValid) throw new UnauthorizedException('Invalid token');

    const user = await this.userRepo.findOne({
      where: { email },
      relations: ['languageSettings'],
    });
    if (!user?.clientId) {
      throw new InternalServerErrorException('Client ID missing');
    }

    await this.ensureDefaultLanguageSettings(user);

    return user;
  }

  async verifyMagicLink(token: string, email: string, res: Response) {
    const user = await this.verifyMagicLinkToken(token, email);

    res.cookie('session', user.clientId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7 * 1000, // 7 days
      path: '/',
      sameSite: 'lax',
    });

    return user;
  }

  async ensureUserByEmail(email: string): Promise<User> {
    const normalized = String(email || '').trim().toLowerCase();
    if (!normalized) {
      throw new BadRequestException('Email is required');
    }

    let user = await this.userRepo.findOne({
      where: { email: normalized },
      relations: ['languageSettings'],
    });

    if (!user) {
      user = this.userRepo.create({
        email: normalized,
        clientId: uuidv4(),
        role: 'learner',
        hasCompletedSignup: false,
      });
      await this.userRepo.save(user);
      user = await this.userRepo.findOne({
        where: { id: user.id },
        relations: ['languageSettings'],
      });
    } else if (!user.clientId) {
      user.clientId = uuidv4();
      await this.userRepo.save(user);
      user = await this.userRepo.findOne({
        where: { id: user.id },
        relations: ['languageSettings'],
      });
    }

    if (!user) {
      throw new InternalServerErrorException('Unable to resolve user');
    }

    await this.ensureDefaultLanguageSettings(user);

    return user;
  }

  async markSignupCompleteByUserId(userId: number): Promise<User> {
    if (!Number.isFinite(userId) || userId <= 0) {
      throw new BadRequestException('Invalid user ID');
    }

    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['languageSettings'],
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.hasCompletedSignup) {
      user.hasCompletedSignup = true;
      await this.userRepo.save(user);
    }

    return user;
  }

  async findUserByClientId(clientId: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { clientId }, relations: ['languageSettings'], });
  }

  async getClientIdFromSession(req: AuthenticatedRequest): Promise<string> {
    const headerAuth = this.resolveHeaderAuth(req);
    if (headerAuth?.clientId) {
      return headerAuth.clientId;
    }

    const user = await this.getUserFromSession(req);
    return user.clientId;
  }

  async getUserFromSession(req: AuthenticatedRequest): Promise<User> {
    const headerAuth = this.resolveHeaderAuth(req);
    if (headerAuth?.userId) {
      const fromHeader = await this.userRepo.findOne({
        where: { id: headerAuth.userId },
        relations: ['languageSettings'],
      });
      if (fromHeader) return fromHeader;
    }
    if (headerAuth?.clientId) {
      const fromHeader = await this.userRepo.findOne({
        where: { clientId: headerAuth.clientId },
        relations: ['languageSettings'],
      });
      if (fromHeader) return fromHeader;
    }

    const authHeader = this.getHeader(req, 'authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      if (token) {
        try {
          return await this.getUserFromAccessToken(token);
        } catch {
          // Fall through to session-based auth checks.
        }
      }
    }

    const sessionUser = req.session?.user;
    if (!sessionUser?.id) {
      throw new UnauthorizedException('User not authenticated');
    }

    const fromSession = await this.userRepo.findOne({
      where: { id: sessionUser.id },
      relations: ['languageSettings'],
    });

    if (!fromSession) {
      throw new UnauthorizedException('User not found');
    }

    return fromSession;
  }
}
