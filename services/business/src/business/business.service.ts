import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ActivateBusinessAccountDto, BusinessDetailsDto } from './business.dto';

type PaymentIntentResult = {
  id: string;
  clientSecret: string;
  status: string;
  amountCents: number;
  currency: string;
  provider: 'stripe';
  livemode: boolean;
};

type DiscountQuoteResult = {
  valid: boolean;
  reason?: string | null;
  promoCode: string | null;
  discountCents: number;
  totalCents: number;
  currency: string;
};

type BusinessOnboardingState = {
  clientId: string;
  step: number;
  details: BusinessDetailsDto | null;
  staffEmails: string[];
  promoCode: string | null;
  promoRedeemed: boolean;
  paymentIntentId: string | null;
  paymentStatus: 'pending' | 'succeeded' | 'waived';
  activatedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const DEFAULT_PRICE_CENTS = 4900;
const DEFAULT_CURRENCY = 'eur';

@Injectable()
export class BusinessService {
  private readonly logger = new Logger(BusinessService.name);
  private readonly paymentUrl = process.env.PAYMENT_SERVICE_URL || 'http://payment:3017';
  private readonly discountUrl = process.env.DISCOUNT_SERVICE_URL || 'http://discounts:3020';
  private readonly onboardingStore = new Map<string, BusinessOnboardingState>();

  private upsertState(clientId: string): BusinessOnboardingState {
    const now = new Date().toISOString();
    const existing = this.onboardingStore.get(clientId);
    if (existing) {
      existing.updatedAt = now;
      return existing;
    }

    const created: BusinessOnboardingState = {
      clientId,
      step: 1,
      details: null,
      staffEmails: [],
      promoCode: null,
      promoRedeemed: false,
      paymentIntentId: null,
      paymentStatus: 'pending',
      activatedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    this.onboardingStore.set(clientId, created);
    return created;
  }

  private sanitizeEmailList(staffEmails: string[]) {
    const unique = new Set<string>();
    for (const raw of staffEmails) {
      const email = raw.trim().toLowerCase();
      if (!email) continue;
      unique.add(email);
    }
    return [...unique];
  }

  private async quoteExternalDiscount(code?: string | null): Promise<DiscountQuoteResult> {
    const normalized = (code || '').trim().toUpperCase();
    if (!normalized) {
      return {
        valid: false,
        promoCode: null,
        discountCents: 0,
        totalCents: DEFAULT_PRICE_CENTS,
        currency: DEFAULT_CURRENCY,
      };
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (process.env.INTERNAL_AUTH_SECRET) {
      headers['x-internal-auth'] = process.env.INTERNAL_AUTH_SECRET;
    }

    try {
      const response = await fetch(`${this.discountUrl}/discounts/quote`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          code: normalized,
          audience: 'business',
          appliesTo: 'business-kit',
          baseCents: DEFAULT_PRICE_CENTS,
          currency: DEFAULT_CURRENCY,
        }),
      });

      if (!response.ok) {
        throw new Error(`Discount quote failed (${response.status})`);
      }

      const payload = (await response.json()) as DiscountQuoteResult;
      return {
        valid: Boolean(payload.valid),
        reason: payload.reason ?? null,
        promoCode: payload.promoCode || null,
        discountCents: Number(payload.discountCents || 0),
        totalCents: Number(payload.totalCents || DEFAULT_PRICE_CENTS),
        currency: String(payload.currency || DEFAULT_CURRENCY),
      };
    } catch (error) {
      this.logger.warn(`Discount service unavailable: ${error instanceof Error ? error.message : String(error)}`);
      return {
        valid: false,
        reason: 'unavailable',
        promoCode: null,
        discountCents: 0,
        totalCents: DEFAULT_PRICE_CENTS,
        currency: DEFAULT_CURRENCY,
      };
    }
  }

  private async redeemExternalDiscount(code?: string | null): Promise<DiscountQuoteResult> {
    const normalized = (code || '').trim().toUpperCase();
    if (!normalized) {
      return {
        valid: false,
        reason: null,
        promoCode: null,
        discountCents: 0,
        totalCents: DEFAULT_PRICE_CENTS,
        currency: DEFAULT_CURRENCY,
      };
    }

    const response = await fetch(`${this.discountUrl}/discounts/redeem`, {
      method: 'POST',
      headers: this.internalHeaders(),
      body: JSON.stringify({
        code: normalized,
        audience: 'business',
        appliesTo: 'business-kit',
        baseCents: DEFAULT_PRICE_CENTS,
        currency: DEFAULT_CURRENCY,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      this.logger.error(`Discount redemption failed (${response.status}): ${text}`);
      throw new InternalServerErrorException('Unable to redeem discount code');
    }

    const payload = (await response.json()) as DiscountQuoteResult;
    return {
      valid: Boolean(payload.valid),
      reason: payload.reason ?? null,
      promoCode: payload.promoCode || null,
      discountCents: Number(payload.discountCents || 0),
      totalCents: Number(payload.totalCents || DEFAULT_PRICE_CENTS),
      currency: String(payload.currency || DEFAULT_CURRENCY),
    };
  }

  private internalHeaders() {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (process.env.INTERNAL_AUTH_SECRET) {
      headers['x-internal-auth'] = process.env.INTERNAL_AUTH_SECRET;
    }

    return headers;
  }

  private async createExternalPaymentIntent(
    clientId: string,
    amountCents: number,
  ): Promise<PaymentIntentResult> {
    const response = await fetch(`${this.paymentUrl}/payments/intents`, {
      method: 'POST',
      headers: this.internalHeaders(),
      body: JSON.stringify({
        clientId,
        amountCents,
        currency: DEFAULT_CURRENCY,
        description: 'Misneach Fáilte Business Kit',
        metadata: {
          product: 'business-kit',
          sourceService: 'business',
        },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      this.logger.error(`Payment intent request failed (${response.status}): ${text}`);
      throw new InternalServerErrorException('Unable to create payment intent');
    }

    return (await response.json()) as PaymentIntentResult;
  }

  private async confirmExternalPaymentIntent(paymentIntentId: string): Promise<PaymentIntentResult> {
    const response = await fetch(`${this.paymentUrl}/payments/intents/confirm`, {
      method: 'POST',
      headers: this.internalHeaders(),
      body: JSON.stringify({ paymentIntentId }),
    });

    if (!response.ok) {
      const text = await response.text();
      this.logger.error(`Payment confirmation failed (${response.status}): ${text}`);
      throw new InternalServerErrorException('Unable to confirm payment');
    }

    return (await response.json()) as PaymentIntentResult;
  }

  async getOnboarding(clientId: string) {
    const state = this.upsertState(clientId);
    const quote = await this.quoteExternalDiscount(state.promoCode);
    const discountPercent =
      DEFAULT_PRICE_CENTS <= 0
        ? 0
        : Math.round(((DEFAULT_PRICE_CENTS - quote.totalCents) / DEFAULT_PRICE_CENTS) * 100);

    return {
      onboarding: state,
      pricing: {
        amountCents: DEFAULT_PRICE_CENTS,
        totalCents: quote.totalCents,
        currency: quote.currency,
        promoCode: quote.promoCode,
        discountPercent,
      },
    };
  }

  saveDetails(clientId: string, details: BusinessDetailsDto) {
    const state = this.upsertState(clientId);
    state.details = details;
    state.step = Math.max(state.step, 2);

    return {
      onboarding: state,
    };
  }

  saveStaff(clientId: string, staffEmails: string[]) {
    const state = this.upsertState(clientId);
    state.staffEmails = this.sanitizeEmailList(staffEmails);
    state.step = Math.max(state.step, 3);

    return {
      onboarding: state,
      staffCount: state.staffEmails.length,
    };
  }

  validatePromo(clientId: string, promoCode: string) {
    return this.validatePromoAsync(clientId, promoCode);
  }

  private async validatePromoAsync(clientId: string, promoCode: string) {
    const state = this.upsertState(clientId);
    const quote = await this.quoteExternalDiscount(promoCode);
    state.promoCode = quote.valid ? quote.promoCode : null;
    state.promoRedeemed = false;

    const discountPercent =
      DEFAULT_PRICE_CENTS <= 0
        ? 0
        : Math.round(((DEFAULT_PRICE_CENTS - quote.totalCents) / DEFAULT_PRICE_CENTS) * 100);

    return {
      valid: quote.valid,
      promoCode: quote.promoCode,
      discountPercent,
      totalCents: quote.totalCents,
      currency: quote.currency,
    };
  }

  async createPaymentIntent(clientId: string, promoCode?: string) {
    const state = this.upsertState(clientId);
    const quote = await this.redeemExternalDiscount(promoCode);
    const totalCents = quote.totalCents;

    if (promoCode && !quote.valid) {
      if (quote.reason === 'usage_cap_reached') {
        throw new ConflictException('Discount code usage cap reached');
      }
      throw new BadRequestException('Invalid discount code');
    }

    state.promoCode = quote.valid ? quote.promoCode : null;
    state.promoRedeemed = Boolean(quote.valid && quote.promoCode);

    if (totalCents === 0) {
      return {
        paymentRequired: false,
        totalCents,
        currency: quote.currency,
      };
    }

    if (!state.details) {
      throw new BadRequestException('Business details must be completed first');
    }

    const intent = await this.createExternalPaymentIntent(clientId, totalCents);
    state.paymentIntentId = intent.id;
    state.step = Math.max(state.step, 3);

    return {
      paymentRequired: true,
      intent,
      totalCents,
      currency: quote.currency,
    };
  }

  async activateAccount(clientId: string, payload: ActivateBusinessAccountDto) {
    const state = this.upsertState(clientId);

    if (!state.details) {
      throw new BadRequestException('Business details are required before activation');
    }

    const quote =
      payload.promoCode || state.promoCode
        ? state.promoRedeemed && !payload.promoCode
          ? await this.quoteExternalDiscount(state.promoCode)
          : await this.redeemExternalDiscount(payload.promoCode || state.promoCode)
        : await this.quoteExternalDiscount(null);
    const totalCents = quote.totalCents;

    if ((payload.promoCode || state.promoCode) && !quote.valid) {
      if (quote.reason === 'usage_cap_reached') {
        throw new ConflictException('Discount code usage cap reached');
      }
      throw new BadRequestException('Invalid discount code');
    }

    if (quote.valid && quote.promoCode) {
      state.promoCode = quote.promoCode;
      state.promoRedeemed = true;
    }

    if (totalCents === 0) {
      state.paymentStatus = 'waived';
      state.promoCode = quote.promoCode;
    } else {
      const paymentIntentId = payload.paymentIntentId || state.paymentIntentId;
      if (!paymentIntentId) {
        throw new BadRequestException('Missing payment intent id');
      }

      const confirmed = await this.confirmExternalPaymentIntent(paymentIntentId);
      if (!['succeeded', 'processing'].includes(confirmed.status)) {
        throw new BadRequestException(`Payment not complete (status: ${confirmed.status})`);
      }

      state.paymentIntentId = confirmed.id;
      state.paymentStatus = 'succeeded';
    }

    state.activatedAt = new Date().toISOString();
    state.step = 5;

    return {
      activated: true,
      onboarding: state,
      kitAssets: this.listKitAssets(clientId).assets,
    };
  }

  listKitAssets(clientId: string) {
    this.upsertState(clientId);
    return {
      assets: [
        {
          key: 'window-sign',
          label: 'Window sign',
          description: 'A4 · SVG & PDF · Print and display in your window',
          href: '/for-businesses#get-started',
        },
        {
          key: 'staff-badge-template',
          label: 'Staff badge template',
          description: 'SVG · Customisable · Tá cúpla focal agam & Labraím Gaeilge',
          href: '/for-businesses#get-started',
        },
        {
          key: 'customer-cheatsheet-cards',
          label: 'Customer cheatsheet cards',
          description: 'A5 · PDF · Key phrases for customers to order in Irish',
          href: '/for-businesses#get-started',
        },
      ],
    };
  }
}
