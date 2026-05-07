import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DiscountCode, DiscountAppliesTo, DiscountAudience } from './discount-code.entity';
import { QuoteDiscountDto, RedeemDiscountDto, UpsertDiscountCodeDto } from './discounts.dto';

@Injectable()
export class DiscountsService {
  constructor(
    @InjectRepository(DiscountCode)
    private readonly discountsRepo: Repository<DiscountCode>,
  ) {}

  normalizeCode(code: string) {
    return code.trim().toUpperCase();
  }

  private normalizeCurrency(currency?: string) {
    return (currency || 'eur').trim().toLowerCase() || 'eur';
  }

  private parseDate(value?: string | null): Date | null {
    if (!value) return null;
    const parsed = new Date(value);
    if (!Number.isFinite(parsed.getTime())) {
      throw new BadRequestException(`Invalid date: ${value}`);
    }
    return parsed;
  }

  private validateWindow(startsAt: Date | null, endsAt: Date | null) {
    if (startsAt && endsAt && startsAt.getTime() > endsAt.getTime()) {
      throw new BadRequestException('startsAt must be before endsAt');
    }
  }

  private normalizeMaxUses(value?: number | null) {
    if (value == null) return null;
    const normalized = Math.floor(value);
    if (!Number.isFinite(normalized) || normalized < 1) {
      throw new BadRequestException('maxUses must be at least 1 when provided');
    }
    return normalized;
  }

  private computeDiscountCents(baseCents: number, code: DiscountCode) {
    if (code.discountType === 'fixed_cents') {
      return Math.max(0, Math.min(baseCents, Math.floor(code.discountValue)));
    }

    const boundedPercent = Math.max(0, Math.min(100, code.discountValue));
    const discount = Math.round(baseCents * (boundedPercent / 100));
    return Math.max(0, Math.min(baseCents, discount));
  }

  private isWindowActive(code: DiscountCode, now: Date) {
    if (code.startsAt && now.getTime() < code.startsAt.getTime()) return false;
    if (code.endsAt && now.getTime() > code.endsAt.getTime()) return false;
    return true;
  }

  private audienceMatches(codeAudience: DiscountAudience, audience: DiscountAudience) {
    return codeAudience === 'both' || codeAudience === audience;
  }

  private appliesToMatches(codeAppliesTo: DiscountAppliesTo, appliesTo: DiscountAppliesTo) {
    return codeAppliesTo === 'any' || codeAppliesTo === appliesTo;
  }

  private usageSummary(code: DiscountCode) {
    return {
      currentUses: code.currentUses,
      maxUses: code.maxUses,
      remainingUses: code.maxUses == null ? null : Math.max(0, code.maxUses - code.currentUses),
    };
  }

  private invalidQuoteResponse(
    entity: DiscountCode | null,
    baseCents: number,
    currency: string,
    reason: string,
  ) {
    return {
      valid: false,
      reason,
      promoCode: entity?.code ?? null,
      discountCents: 0,
      totalCents: baseCents,
      currency,
      currentUses: entity?.currentUses ?? 0,
      maxUses: entity?.maxUses ?? null,
      remainingUses:
        entity?.maxUses == null ? null : Math.max(0, entity.maxUses - entity.currentUses),
    };
  }

  private validateEligibility(
    entity: DiscountCode,
    audience: DiscountAudience,
    appliesTo: DiscountAppliesTo,
    currency: string,
    baseCents: number,
  ) {
    const now = new Date();

    if (!entity.isEnabled) {
      return this.invalidQuoteResponse(entity, baseCents, currency, 'disabled');
    }

    if (!this.isWindowActive(entity, now)) {
      return this.invalidQuoteResponse(entity, baseCents, currency, 'outside_window');
    }

    if (!this.audienceMatches(entity.audience, audience)) {
      return this.invalidQuoteResponse(entity, baseCents, currency, 'audience_mismatch');
    }

    if (!this.appliesToMatches(entity.appliesTo, appliesTo)) {
      return this.invalidQuoteResponse(entity, baseCents, currency, 'applies_to_mismatch');
    }

    if (entity.currency !== currency) {
      return this.invalidQuoteResponse(entity, baseCents, currency, 'currency_mismatch');
    }

    if (entity.maxUses != null && entity.currentUses >= entity.maxUses) {
      return this.invalidQuoteResponse(entity, baseCents, currency, 'usage_cap_reached');
    }

    return null;
  }

  async adminList() {
    return this.discountsRepo.find({
      order: {
        updatedAt: 'DESC',
      },
    });
  }

  async adminCreate(body: UpsertDiscountCodeDto) {
    const code = this.normalizeCode(body.code);
    const existing = await this.discountsRepo.findOne({ where: { code } });
    if (existing) {
      throw new BadRequestException('Discount code already exists');
    }

    const startsAt = this.parseDate(body.startsAt);
    const endsAt = this.parseDate(body.endsAt);
    const maxUses = this.normalizeMaxUses(body.maxUses);
    this.validateWindow(startsAt, endsAt);

    const entity = this.discountsRepo.create({
      code,
      label: body.label?.trim() || null,
      description: body.description?.trim() || null,
      audience: body.audience,
      appliesTo: body.appliesTo,
      discountType: body.discountType,
      discountValue: Math.floor(body.discountValue),
      currency: this.normalizeCurrency(body.currency),
      isEnabled: body.isEnabled,
      maxUses,
      startsAt,
      endsAt,
    });

    return this.discountsRepo.save(entity);
  }

  async adminUpdate(id: number, body: UpsertDiscountCodeDto) {
    const entity = await this.discountsRepo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Discount code not found');

    const nextCode = this.normalizeCode(body.code);
    if (nextCode !== entity.code) {
      const existing = await this.discountsRepo.findOne({ where: { code: nextCode } });
      if (existing && existing.id !== id) {
        throw new BadRequestException('Discount code already exists');
      }
    }

    const startsAt = this.parseDate(body.startsAt);
    const endsAt = this.parseDate(body.endsAt);
    const maxUses = this.normalizeMaxUses(body.maxUses);
    this.validateWindow(startsAt, endsAt);
    if (maxUses != null && maxUses < entity.currentUses) {
      throw new BadRequestException('maxUses cannot be lower than currentUses');
    }

    entity.code = nextCode;
    entity.label = body.label?.trim() || null;
    entity.description = body.description?.trim() || null;
    entity.audience = body.audience;
    entity.appliesTo = body.appliesTo;
    entity.discountType = body.discountType;
    entity.discountValue = Math.floor(body.discountValue);
    entity.currency = this.normalizeCurrency(body.currency);
    entity.isEnabled = body.isEnabled;
    entity.maxUses = maxUses;
    entity.startsAt = startsAt;
    entity.endsAt = endsAt;

    return this.discountsRepo.save(entity);
  }

  async adminToggle(id: number, isEnabled: boolean) {
    const entity = await this.discountsRepo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException('Discount code not found');
    entity.isEnabled = isEnabled;
    return this.discountsRepo.save(entity);
  }

  async quote(body: QuoteDiscountDto) {
    const normalizedCode = this.normalizeCode(body.code);
    const audience = body.audience;
    const appliesTo = body.appliesTo;
    const baseCents = Math.max(0, Math.floor(body.baseCents));
    const currency = this.normalizeCurrency(body.currency);

    const entity = await this.discountsRepo.findOne({
      where: { code: normalizedCode },
    });

    if (!entity) {
      return this.invalidQuoteResponse(null, baseCents, currency, 'not_found');
    }

    const invalid = this.validateEligibility(entity, audience, appliesTo, currency, baseCents);
    if (invalid) {
      return invalid;
    }

    const discountCents = this.computeDiscountCents(baseCents, entity);
    const totalCents = Math.max(0, baseCents - discountCents);

    return {
      valid: true,
      reason: null,
      promoCode: entity.code,
      discountCents,
      totalCents,
      currency,
      discountType: entity.discountType,
      discountValue: entity.discountValue,
      ...this.usageSummary(entity),
      startsAt: entity.startsAt,
      endsAt: entity.endsAt,
      audience: entity.audience,
      appliesTo: entity.appliesTo,
    };
  }

  async redeem(body: RedeemDiscountDto) {
    const normalizedCode = this.normalizeCode(body.code);
    const audience = body.audience;
    const appliesTo = body.appliesTo;
    const baseCents = Math.max(0, Math.floor(body.baseCents));
    const currency = this.normalizeCurrency(body.currency);

    const entity = await this.discountsRepo.findOne({
      where: { code: normalizedCode },
    });

    if (!entity) {
      return this.invalidQuoteResponse(null, baseCents, currency, 'not_found');
    }

    const invalid = this.validateEligibility(entity, audience, appliesTo, currency, baseCents);
    if (invalid) {
      return invalid;
    }

    const update = this.discountsRepo
      .createQueryBuilder()
      .update(DiscountCode)
      .set({ currentUses: () => 'currentUses + 1' })
      .where('id = :id', { id: entity.id });

    if (entity.maxUses != null) {
      update.andWhere('currentUses < maxUses');
    }

    const result = await update.execute();
    if (!result.affected) {
      const fresh = await this.discountsRepo.findOne({ where: { id: entity.id } });
      return this.invalidQuoteResponse(fresh ?? entity, baseCents, currency, 'usage_cap_reached');
    }

    const redeemed = await this.discountsRepo.findOne({ where: { id: entity.id } });
    if (!redeemed) {
      throw new NotFoundException('Discount code not found');
    }

    const discountCents = this.computeDiscountCents(baseCents, redeemed);
    const totalCents = Math.max(0, baseCents - discountCents);

    return {
      valid: true,
      reason: null,
      promoCode: redeemed.code,
      discountCents,
      totalCents,
      currency,
      discountType: redeemed.discountType,
      discountValue: redeemed.discountValue,
      ...this.usageSummary(redeemed),
      startsAt: redeemed.startsAt,
      endsAt: redeemed.endsAt,
      audience: redeemed.audience,
      appliesTo: redeemed.appliesTo,
    };
  }
}
