import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('course_progress')
@Index('idx_course_progress_client_course_lesson_unique', ['clientId', 'courseSlug', 'lessonSlug'], {
  unique: true,
})
@Index('idx_course_progress_client_status', ['clientId', 'status'])
export class CourseProgress {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id!: string;

  @Column({ type: 'varchar', length: 191 })
  clientId!: string;

  @Column({ type: 'varchar', length: 128 })
  courseSlug!: string;

  @Column({ type: 'varchar', length: 128 })
  lessonSlug!: string;

  @Column({ type: 'varchar', length: 64 })
  contentVersion!: string;

  @Column({ type: 'enum', enum: ['not_started', 'in_progress', 'completed'], default: 'not_started' })
  status!: 'not_started' | 'in_progress' | 'completed';

  @Column({ type: 'int', default: 0 })
  progressPercent!: number;

  @Column({ type: 'varchar', length: 128, nullable: true })
  lastBlockId!: string | null;

  @Column({ type: 'int', unsigned: true, default: 0 })
  timeSpentSec!: number;

  @Column({ type: 'text', nullable: true })
  microCompletedChunkIds!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  microLastChunkId!: string | null;

  @Column({ type: 'datetime', nullable: true })
  microUpdatedAt!: Date | null;

  @Column({ type: 'longtext', nullable: true })
  swapQuizState!: string | null;

  @Column({ type: 'datetime', nullable: true })
  startedAt!: Date | null;

  @Column({ type: 'datetime' })
  lastSeenAt!: Date;

  @Column({ type: 'datetime', nullable: true })
  completedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

@Entity('course_lexicon_events')
@Index('idx_course_lexicon_events_client_event_unique', ['clientId', 'eventId'], {
  unique: true,
})
@Index('idx_course_lexicon_events_client_created', ['clientId', 'createdAt'])
export class CourseLexiconEvent {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id!: string;

  @Column({ type: 'varchar', length: 191 })
  clientId!: string;

  @Column({ type: 'varchar', length: 128 })
  courseSlug!: string;

  @Column({ type: 'varchar', length: 128 })
  lessonSlug!: string;

  @Column({ type: 'enum', enum: ['render', 'hover', 'gloss', 'swap_correct', 'swap_incorrect'] })
  source!: 'render' | 'hover' | 'gloss' | 'swap_correct' | 'swap_incorrect';

  @Column({ type: 'varchar', length: 128 })
  eventId!: string;

  @Column({ type: 'varchar', length: 64 })
  contentVersion!: string;

  @CreateDateColumn()
  createdAt!: Date;
}

@Entity('course_drafts')
@Index('idx_course_drafts_slug_unique', ['courseSlug'], { unique: true })
export class CourseDraft {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id!: string;

  @Column({ type: 'varchar', length: 128 })
  courseSlug!: string;

  @Column({ type: 'varchar', length: 255 })
  courseTitle!: string;

  @Column({ type: 'varchar', length: 12, default: 'ga' })
  lang!: string;

  @Column({ type: 'text', nullable: true })
  summary!: string | null;

  @Column({ type: 'int', nullable: true })
  updatedByUserId!: number | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

@Entity('lesson_drafts')
@Index('idx_lesson_drafts_course_lesson_unique', ['courseSlug', 'lessonSlug'], { unique: true })
@Index('idx_lesson_drafts_course_order', ['courseSlug', 'order'])
export class LessonDraft {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id!: string;

  @Column({ type: 'varchar', length: 128 })
  courseSlug!: string;

  @Column({ type: 'varchar', length: 128 })
  lessonSlug!: string;

  @Column({ type: 'varchar', length: 255 })
  lessonTitle!: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  moduleKey!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  moduleName!: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  unitKey!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  unitName!: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  group!: string | null;

  @Column({ type: 'int', default: 1 })
  order!: number;

  @Column({ type: 'varchar', length: 12, default: 'ga' })
  lang!: string;

  @Column({ type: 'int', default: 10 })
  estimatedMinutes!: number;

  @Column({ type: 'text', nullable: true })
  summary!: string | null;

  @Column({ type: 'longtext', nullable: true })
  tagsJson!: string | null;

  @Column({ type: 'longtext' })
  markdown!: string;

  @Column({ type: 'longtext', nullable: true })
  lessonJson!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  contentVersion!: string | null;

  @Column({ type: 'longtext', nullable: true })
  validationErrorsJson!: string | null;

  @Column({ type: 'boolean', default: false })
  isValid!: boolean;

  @Column({ type: 'int', unsigned: true, default: 1 })
  revision!: number;

  @Column({ type: 'int', nullable: true })
  updatedByUserId!: number | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

@Entity('course_releases')
@Index('idx_course_releases_status_created', ['status', 'createdAt'])
export class CourseRelease {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id!: string;

  @Column({ type: 'varchar', length: 64 })
  contentVersion!: string;

  @Column({ type: 'enum', enum: ['candidate', 'published'], default: 'candidate' })
  status!: 'candidate' | 'published';

  @Column({ type: 'varchar', length: 191, nullable: true })
  label!: string | null;

  @Column({ type: 'longtext' })
  manifestJson!: string;

  @Column({ type: 'int', nullable: true })
  createdByUserId!: number | null;

  @Column({ type: 'int', nullable: true })
  publishedByUserId!: number | null;

  @Column({ type: 'datetime', nullable: true })
  publishedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

@Entity('course_release_lessons')
@Index('idx_course_release_lessons_release_course_lesson_unique', ['releaseId', 'courseSlug', 'lessonSlug'], {
  unique: true,
})
@Index('idx_course_release_lessons_release', ['releaseId'])
export class CourseReleaseLesson {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id!: string;

  @Column({ type: 'bigint', unsigned: true })
  releaseId!: string;

  @Column({ type: 'varchar', length: 128 })
  courseSlug!: string;

  @Column({ type: 'varchar', length: 128 })
  lessonSlug!: string;

  @Column({ type: 'varchar', length: 64 })
  contentVersion!: string;

  @Column({ type: 'longtext' })
  lessonJson!: string;

  @CreateDateColumn()
  createdAt!: Date;
}

@Entity('course_active_release')
export class CourseActiveRelease {
  @PrimaryColumn({ type: 'tinyint', unsigned: true, default: 1 })
  id!: number;

  @Column({ type: 'bigint', unsigned: true })
  releaseId!: string;

  @Column({ type: 'int', nullable: true })
  updatedByUserId!: number | null;

  @UpdateDateColumn()
  updatedAt!: Date;
}

@Entity('admin_audit_log')
@Index('idx_admin_audit_actor_created', ['actorUserId', 'createdAt'])
@Index('idx_admin_audit_target_created', ['targetType', 'targetId', 'createdAt'])
export class AdminAuditLog {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id!: string;

  @Column({ type: 'int', nullable: true })
  actorUserId!: number | null;

  @Column({ type: 'varchar', length: 80 })
  action!: string;

  @Column({ type: 'varchar', length: 80 })
  targetType!: string;

  @Column({ type: 'varchar', length: 191 })
  targetId!: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  beforeHash!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  afterHash!: string | null;

  @Column({ type: 'longtext', nullable: true })
  metadataJson!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
