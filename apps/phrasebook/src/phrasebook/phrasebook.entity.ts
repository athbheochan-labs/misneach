import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  JoinColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('phrase_categories')
export class PhraseCategory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false })
  clientId: string;

  @Column({ type: 'varchar', length: 100, nullable: false })
  name: string;

  @Column({ type: 'timestamp', nullable: false })
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  archivedAt?: Date | null;

  @OneToMany(() => PhraseGroup, (group) => group.category)
  groups: PhraseGroup[];

  @OneToMany(() => Phrase, (phrase) => phrase.category)
  phrases: Phrase[];
}

@Entity('phrase_groups')
export class PhraseGroup {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false })
  clientId: string;

  @Column({ type: 'int', nullable: false })
  categoryId: number;

  @ManyToOne(() => PhraseCategory, (category) => category.groups, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'categoryId' })
  category: PhraseCategory;

  @Column({ type: 'varchar', length: 150, nullable: false })
  name: string;

  @Column({ type: 'timestamp', nullable: false })
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  archivedAt?: Date | null;

  @OneToMany(() => Phrase, (phrase) => phrase.group)
  phrases: Phrase[];
}

/**
 * Represents a stored linguistic phrase (sentence or phrase)
 * derived from NLP ingestion events.
 *
 * Phrases are used for:
 * - learning context
 * - example sentences
 * - spaced repetition
 * - traceability of user exposure
 */
@Entity('phrases')
export class Phrase {
  @PrimaryGeneratedColumn()
  id: number;

  // Original text of the phrase
  @Column({ name: 'text', type: 'varchar', length: 2000, nullable: false })
  text: string;

  // Optional meaning for the phrase
  @Column({ name: 'meaning', type: 'varchar', length: 2000, nullable: true })
  meaning?: string;

  // ISO language code
  @Column({ name: 'language', nullable: false, length: 10 })
  language: string;

  // Source (nlp, manual, etc.)
  @Column({ name: 'source', nullable: false, length: 30 })
  source: string;

  // Client identifier
  @Column({ name: 'clientId', nullable: false })
  clientId: string;

  // Fingerprint for deduplication
  @Column({ name: 'fingerprint', nullable: false, length: 64, unique: true })
  fingerprint: string;

  // Timestamp of creation
  @Column({ name: 'createdAt', type: 'timestamp', nullable: false })
  createdAt: Date;

  @Column({ type: 'varchar', length: 500, nullable: true })
  pronunciation?: string;

  @Column({ type: 'varchar', length: 2000, nullable: true })
  translation?: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  translationLanguage?: string;

  @Column({ type: 'varchar', length: 2000, nullable: true })
  example?: string;

  @Column({ type: 'varchar', length: 4000, nullable: true })
  notes?: string;

  @Column({ type: 'int', nullable: true })
  categoryId?: number | null;

  @ManyToOne(() => PhraseCategory, (category) => category.phrases, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'categoryId' })
  category?: PhraseCategory | null;

  @Column({ type: 'int', nullable: true })
  groupId?: number | null;

  @ManyToOne(() => PhraseGroup, (group) => group.phrases, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'groupId' })
  group?: PhraseGroup | null;

  @Column({ type: 'boolean', default: false })
  inPractice: boolean;

  @Column({ type: 'boolean', default: false })
  inFlashcards: boolean;

  @OneToMany(() => PhraseToken, (token) => token.phrase)
  tokens: PhraseToken[];

  @Column({ type: 'varchar', length: 36, nullable: true, unique: true })
  requestId?: string;
}

@Entity('phrase_tokens')
export class PhraseToken {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Phrase, { onDelete: 'CASCADE' })
  phrase: Phrase;

  @Column()
  word: string;

  @Column()
  position: number;

  @Column({ length: 100 })
  surface: string;

  @Column({ nullable: false, length: 50 })
  lemma?: string;

  @Column({ length: 100 })
  pos: string;
}
