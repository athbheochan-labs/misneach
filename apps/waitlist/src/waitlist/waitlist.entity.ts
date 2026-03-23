import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from 'typeorm';

export type WaitlistInterest = 'business_pack' | 'individual_course_access';

@Entity('waitlist_entries')
@Unique(['email', 'interest'])
export class WaitlistEntry {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 320 })
  email!: string;

  @Column({ length: 120, nullable: true })
  name!: string | null;

  @Column({ type: 'varchar', length: 40 })
  interest!: WaitlistInterest;

  @Column({ length: 120, nullable: true })
  source!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
