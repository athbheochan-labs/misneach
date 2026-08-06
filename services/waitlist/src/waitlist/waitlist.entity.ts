import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';
import type { WaitlistInterest } from '@misneach/public-flows';

@Entity('waitlist_entries')
@Unique(['email', 'interest'])
export class WaitlistEntry {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 320 })
  email!: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  name!: string | null;

  @Column({ type: 'varchar', length: 40 })
  interest!: WaitlistInterest;

  @Column({ type: 'varchar', length: 120, nullable: true })
  source!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
