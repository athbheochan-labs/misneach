import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
  IsBoolean,
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
  inPractice: boolean;
  inFlashcards: boolean;
  tokens?: PhraseTokenDto[];
}
