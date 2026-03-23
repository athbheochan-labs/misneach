import { IsInt, IsNotEmpty, IsObject, IsOptional, IsString, Min } from 'class-validator';

export class CreatePaymentIntentDto {
  @IsString()
  @IsNotEmpty()
  clientId!: string;

  @IsInt()
  @Min(0)
  amountCents!: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, string>;
}

export class ConfirmPaymentIntentDto {
  @IsString()
  @IsNotEmpty()
  paymentIntentId!: string;
}

export class CreateCheckoutSessionDto {
  @IsString()
  @IsNotEmpty()
  clientId!: string;

  @IsInt()
  @Min(0)
  amountCents!: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  successUrl!: string;

  @IsString()
  @IsNotEmpty()
  cancelUrl!: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, string>;
}
