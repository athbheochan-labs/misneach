import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
  IsBoolean,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';

// A token in a phrase
export class PhraseTokenDto {
  @IsNumber()
  position: number;

  @IsString()
  surface: string;

  @IsString()
  lemma: string;

  @IsString()
  pos: string;
}

// Data needed to create or update a phrase
export class UpdatePhraseDto {
  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsBoolean()
  autoTranslation?: boolean;

  @IsOptional()
  @IsString()
  translation?: string;

  @IsOptional()
  @IsString()
  pronunciation?: string;

  @IsOptional()
  @IsString()
  example?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  groupName?: string;

  @IsOptional()
  @IsInt()
  categoryId?: number;

  @IsOptional()
  @IsInt()
  groupId?: number;

  @IsOptional()
  @IsBoolean()
  inPractice?: boolean;

  @IsOptional()
  @IsBoolean()
  inFlashcards?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PhraseTokenDto)
  tokens?: PhraseTokenDto[];
}

// Response DTO for a phrase
export class PhrasebookStatementDto {
  id: number;
  text: string;
  source: string;
  autoTranslation?: boolean;
  translation?: string | null;
  pronunciation?: string | null;
  example?: string | null;
  notes?: string | null;
  categoryId?: number | null;
  category?: string | null;
  groupId?: number | null;
  groupName?: string | null;
  inPractice: boolean;
  inFlashcards: boolean;
  tokens?: PhraseTokenDto[];
}

export class PhrasebookSummaryDto {
  total: number;
  inPractice: number;
  inFlashcards: number;
  own: number;
}

export class PhrasebookPageDto {
  items: PhrasebookStatementDto[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  summary: PhrasebookSummaryDto;
}

export class PhraseCategoryDto {
  id: number;
  name: string;
  archived: boolean;
  groupCount: number;
}

export class PhraseGroupDto {
  id: number;
  categoryId: number;
  name: string;
  archived: boolean;
}
