import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class CourseMicroProgressUpdateDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(24)
  completedChunkIds?: string[];

  @IsOptional()
  @IsString()
  lastChunkId?: string;
}

export class CourseProgressUpdateDto {
  @IsOptional()
  @IsString()
  lastBlockId?: string;

  @IsOptional()
  @IsBoolean()
  completed?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  progressPercent?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  timeSpentDeltaSec?: number;

  @IsString()
  contentVersion!: string;

  @IsOptional()
  @IsObject()
  swapQuizState?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CourseMicroProgressUpdateDto)
  micro?: CourseMicroProgressUpdateDto;
}

const EXPOSURE_SOURCE = ['render', 'hover', 'gloss', 'swap_correct', 'swap_incorrect'] as const;

export class CourseLexiconExposureDto {
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(120)
  tokens!: string[];

  @IsEnum(EXPOSURE_SOURCE)
  source!: 'render' | 'hover' | 'gloss' | 'swap_correct' | 'swap_incorrect';

  @IsString()
  eventId!: string;

  @IsString()
  contentVersion!: string;
}

export class CourseGlossLookupDto {
  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsOptional()
  @IsString()
  context?: string;

  @IsOptional()
  @IsString()
  blockId?: string;
}

export class AdminCourseLessonDraftUpdateDto {
  @IsOptional()
  @IsString()
  courseTitle?: string;

  @IsOptional()
  @IsString()
  courseLang?: string;

  @IsOptional()
  @IsString()
  courseSummary?: string;

  @IsOptional()
  @IsString()
  lessonTitle?: string;

  @IsOptional()
  @IsString()
  moduleKey?: string;

  @IsOptional()
  @IsString()
  moduleName?: string;

  @IsOptional()
  @IsString()
  unitKey?: string;

  @IsOptional()
  @IsString()
  unitName?: string;

  @IsOptional()
  @IsString()
  group?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  order?: number;

  @IsOptional()
  @IsString()
  lang?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  estimatedMinutes?: number;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  resumeBlocks?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  lexicon_include?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  lexicon_exclude?: string[];

  @IsOptional()
  @IsArray()
  tokenGlosses?: Record<string, unknown>[];

  @IsOptional()
  @IsObject()
  pedagogy?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  markdown?: string;
}

export class AdminPreviewTokenRequestDto {
  @IsOptional()
  @IsString()
  releaseId?: string;
}

export class AdminPublishReleaseRequestDto {
  @IsOptional()
  @IsString()
  releaseId?: string;

  @IsOptional()
  @IsString()
  label?: string;
}
