import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  DiscountAppliesTo,
  DiscountAudience,
  DiscountType,
} from './discount-code.entity';

export class QuoteDiscountDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsEnum(['learner', 'business'] as const)
  audience!: 'learner' | 'business';

  @IsEnum(['monthly', 'annual', 'business-kit', 'any'] as const)
  appliesTo!: DiscountAppliesTo;

  @IsInt()
  @Min(0)
  baseCents!: number;

  @IsString()
  @IsOptional()
  @MaxLength(8)
  currency?: string;
}

export class UpsertDiscountCodeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  code!: string;

  @IsString()
  @IsOptional()
  @MaxLength(160)
  label?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(['learner', 'business', 'both'] as const)
  audience!: DiscountAudience;

  @IsEnum(['monthly', 'annual', 'business-kit', 'any'] as const)
  appliesTo!: DiscountAppliesTo;

  @IsEnum(['percent', 'fixed_cents'] as const)
  discountType!: DiscountType;

  @IsInt()
  @Min(0)
  @Max(1000000)
  discountValue!: number;

  @IsString()
  @IsOptional()
  @MaxLength(8)
  currency?: string;

  @IsBoolean()
  isEnabled!: boolean;

  @IsString()
  @IsOptional()
  startsAt?: string | null;

  @IsString()
  @IsOptional()
  endsAt?: string | null;
}

export class ToggleDiscountCodeDto {
  @IsBoolean()
  isEnabled!: boolean;
}
