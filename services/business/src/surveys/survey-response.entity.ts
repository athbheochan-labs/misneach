import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('survey_responses')
export class SurveyResponseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 120 })
  templateKey!: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  campaignId!: string | null;

  @Column({ type: 'simple-json' })
  answers!: Record<string, unknown>;

  @Column({ type: 'simple-json', nullable: true })
  meta!: Record<string, unknown> | null;

  @CreateDateColumn()
  submittedAt!: Date;
}
