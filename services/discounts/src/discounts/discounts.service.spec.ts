import { Repository } from 'typeorm';
import { DiscountCode } from './discount-code.entity';
import { DiscountsService } from './discounts.service';

function buildCode(overrides: Partial<DiscountCode> = {}): DiscountCode {
  return {
    id: 1,
    code: 'SPRING25',
    label: null,
    description: null,
    audience: 'learner',
    appliesTo: 'monthly',
    discountType: 'percent',
    discountValue: 25,
    currency: 'eur',
    isEnabled: true,
    maxUses: 2,
    currentUses: 0,
    startsAt: null,
    endsAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('DiscountsService', () => {
  it('reports remaining uses when quoting a valid capped code', async () => {
    const repo = {
      findOne: jest.fn().mockResolvedValue(buildCode({ currentUses: 1, maxUses: 3 })),
    } as unknown as Repository<DiscountCode>;

    const service = new DiscountsService(repo);
    const result = await service.quote({
      code: 'spring25',
      audience: 'learner',
      appliesTo: 'monthly',
      baseCents: 1000,
      currency: 'eur',
    });

    expect(result.valid).toBe(true);
    expect(result.currentUses).toBe(1);
    expect(result.maxUses).toBe(3);
    expect(result.remainingUses).toBe(2);
  });

  it('returns usage_cap_reached when a capped code is already exhausted', async () => {
    const repo = {
      findOne: jest.fn().mockResolvedValue(buildCode({ currentUses: 2, maxUses: 2 })),
    } as unknown as Repository<DiscountCode>;

    const service = new DiscountsService(repo);
    const result = await service.quote({
      code: 'spring25',
      audience: 'learner',
      appliesTo: 'monthly',
      baseCents: 1000,
      currency: 'eur',
    });

    expect(result.valid).toBe(false);
    expect(result.reason).toBe('usage_cap_reached');
    expect(result.remainingUses).toBe(0);
  });

  it('handles the cap race by returning usage_cap_reached when the atomic increment loses', async () => {
    const fresh = buildCode({ currentUses: 2, maxUses: 2 });
    const createQueryBuilder = jest.fn().mockReturnValue({
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ affected: 0 }),
    });

    const repo = {
      findOne: jest
        .fn()
        .mockResolvedValueOnce(buildCode({ currentUses: 1, maxUses: 2 }))
        .mockResolvedValueOnce(fresh),
      createQueryBuilder,
    } as unknown as Repository<DiscountCode>;

    const service = new DiscountsService(repo);
    const result = await service.redeem({
      code: 'spring25',
      audience: 'learner',
      appliesTo: 'monthly',
      baseCents: 1000,
      currency: 'eur',
    });

    expect(result.valid).toBe(false);
    expect(result.reason).toBe('usage_cap_reached');
    expect(result.currentUses).toBe(2);
    expect(result.remainingUses).toBe(0);
  });
});
