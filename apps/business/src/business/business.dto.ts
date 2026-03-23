import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class BusinessDetailsDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(140)
  businessName!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  town!: string;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  county?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  ownerName!: string;

  @IsEmail()
  ownerEmail!: string;
}

export class StaffInviteDto {
  @IsArray()
  @ArrayMaxSize(200)
  @IsEmail({}, { each: true })
  staffEmails!: string[];
}

export class PromoValidationDto {
  @IsString()
  @IsNotEmpty()
  promoCode!: string;
}

export class CreateBusinessPaymentIntentDto {
  @IsString()
  @IsOptional()
  promoCode?: string;
}

export class ActivateBusinessAccountDto {
  @IsString()
  @IsOptional()
  paymentIntentId?: string;

  @IsString()
  @IsOptional()
  promoCode?: string;
}

export class CompleteOnboardingDto {
  @ValidateNested()
  @Type(() => BusinessDetailsDto)
  details!: BusinessDetailsDto;

  @IsArray()
  @ArrayMaxSize(200)
  @IsEmail({}, { each: true })
  staffEmails!: string[];

  @ValidateNested()
  @Type(() => ActivateBusinessAccountDto)
  activation!: ActivateBusinessAccountDto;
}
