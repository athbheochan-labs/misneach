import { IsEmail, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class JoinWaitlistDto {
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsIn(['business_pack', 'individual_course_access'])
  interest!: 'business_pack' | 'individual_course_access';

  @IsOptional()
  @IsString()
  @MaxLength(120)
  source?: string;
}
