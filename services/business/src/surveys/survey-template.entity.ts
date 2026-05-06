import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('survey_templates')
export class SurveyTemplateEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 120, unique: true })
  key!: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  legacyId!: string | null;

  @Column({ type: 'varchar', length: 200 })
  title!: string;

  @Column({ type: 'varchar', length: 40 })
  audience!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'simple-json' })
  questions!: unknown[];

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
