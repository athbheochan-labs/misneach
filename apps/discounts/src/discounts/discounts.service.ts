import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DiscountCode, DiscountAppliesTo, DiscountAudience } from './discount-code.entity';
import { QuoteDiscountDto, UpsertDiscountCodeDto } from './discounts.dto';

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
    this.validateWindow(startsAt, endsAt);

    entity.code = nextCode;
    entity.label = body.label?.trim() || null;
    entity.description = body.description?.trim() || null;
    entity.audience = body.audience;
    entity.appliesTo = body.appliesTo;
    entity.discountType = body.discountType;
    entity.discountValue = Math.floor(body.discountValue);
    entity.currency = this.normalizeCurrency(body.currency);
    entity.isEnabled = body.isEnabled;
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
      return {
        valid: false,
        reason: 'not_found',
        promoCode: null,
        discountCents: 0,
        totalCents: baseCents,
        currency,
      };
    }

    const now = new Date();
    if (!entity.isEnabled) {
      return {
        valid: false,
        reason: 'disabled',
        promoCode: entity.code,
        discountCents: 0,
        totalCents: baseCents,
        currency,
      };
    }

    if (!this.isWindowActive(entity, now)) {
      return {
        valid: false,
        reason: 'outside_window',
        promoCode: entity.code,
        discountCents: 0,
        totalCents: baseCents,
        currency,
      };
    }

    if (!this.audienceMatches(entity.audience, audience)) {
      return {
        valid: false,
        reason: 'audience_mismatch',
        promoCode: entity.code,
        discountCents: 0,
        totalCents: baseCents,
        currency,
      };
    }

    if (!this.appliesToMatches(entity.appliesTo, appliesTo)) {
      return {
        valid: false,
        reason: 'applies_to_mismatch',
        promoCode: entity.code,
        discountCents: 0,
        totalCents: baseCents,
        currency,
      };
    }

    if (entity.currency !== currency) {
      return {
        valid: false,
        reason: 'currency_mismatch',
        promoCode: entity.code,
        discountCents: 0,
        totalCents: baseCents,
        currency,
      };
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
      startsAt: entity.startsAt,
      endsAt: entity.endsAt,
      audience: entity.audience,
      appliesTo: entity.appliesTo,
    };
  }
}
