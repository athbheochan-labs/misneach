import {
  IsEmail,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsArray,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RegisterSurveyCampaignDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(140)
  businessName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  town?: string;
}

export class SubmitSurveyResponseBodyDto {
  @IsString()
  @IsOptional()
  campaignId?: string;

  @IsObject()
  answers!: Record<string, unknown>;

  @IsObject()
  @IsOptional()
  meta?: Record<string, unknown>;
}

export class SubmitSurveyResponseDto {
  @IsString()
  @IsNotEmpty()
  templateId!: string;

  @ValidateNested()
  @Type(() => SubmitSurveyResponseBodyDto)
  body!: SubmitSurveyResponseBodyDto;
}

export class UpsertSurveyTemplateDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  key!: string;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  legacyId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @IsString()
  @IsIn(['staff', 'customers'])
  audience!: 'staff' | 'customers';

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  questions!: Record<string, unknown>[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
