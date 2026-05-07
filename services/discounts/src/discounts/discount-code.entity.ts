import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type DiscountAudience = 'learner' | 'business' | 'both';
export type DiscountAppliesTo = 'monthly' | 'annual' | 'business-kit' | 'any';
export type DiscountType = 'percent' | 'fixed_cents';

@Entity()
export class DiscountCode {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true, length: 64 })
  code!: string;

  @Column({ type: 'varchar', length: 160, nullable: true })
  label!: string | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({
    type: 'enum',
    enum: ['learner', 'business', 'both'],
    default: 'both',
  })
  audience!: DiscountAudience;

  @Column({
    type: 'enum',
    enum: ['monthly', 'annual', 'business-kit', 'any'],
    default: 'any',
  })
  appliesTo!: DiscountAppliesTo;

  @Column({
    type: 'enum',
    enum: ['percent', 'fixed_cents'],
    default: 'percent',
  })
  discountType!: DiscountType;

  @Column({ type: 'int', default: 0 })
  discountValue!: number;

  @Column({ type: 'varchar', length: 8, default: 'eur' })
  currency!: string;

  @Column({ type: 'boolean', default: true })
  isEnabled!: boolean;

  @Column({ type: 'int', nullable: true })
  maxUses!: number | null;

  @Column({ type: 'int', default: 0 })
  currentUses!: number;

  @Column({ type: 'datetime', nullable: true })
  startsAt!: Date | null;

  @Column({ type: 'datetime', nullable: true })
  endsAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
