import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { LanguageSetting } from '../../settings/entities/LanguageSetting';
import { MagicLink } from './MagicLink';

/**
 * The User entity represents a user of the application.
 * Each user has a unique email and client ID, along with metadata such as creation date.
 * A user can have profile metadata and multiple magic login links.
 */
@Entity()
export class User {
  /**
   * Auto-generated primary key identifier for the user.
   */
  @PrimaryGeneratedColumn()
  id!: number;

  /**
   * Unique email address used for identification or login.
   */
  @Column({ unique: true })
  email!: string;

  /**
   * Unique client ID used to associate the user across different services (e.g. WebSocket, Kafka).
   */
  @Column({ unique: true })
  clientId!: string;

  @Column({ nullable: true })
  displayName!: string | null;

  @Column({ nullable: true })
  avatarUrl!: string | null;

  @Column({ type: 'boolean', default: true })
  dailyReminderEnabled!: boolean;

  @Column({ default: '09:00' })
  dailyReminderTime!: string;

  /**
   * Role for access control.
   * - learner: default product user
   * - admin: backoffice operator
   */
  @Column({ type: 'enum', enum: ['learner', 'admin'], default: 'learner' })
  role!: 'learner' | 'admin';

  /**
   * True once learner signup flow has been completed.
   * Defaults to true for legacy users; newly created users can be set to false
   * until they finish signup/payment.
   */
  @Column({ type: 'boolean', default: true })
  hasCompletedSignup!: boolean;

  /**
   * Timestamp of when the user account was created.
   * Automatically set when the user is first persisted.
   */
  @CreateDateColumn()
  createdAt!: Date;

  /**
   * Legacy learning-language settings retained for older lexicon and translation flows.
   * New Misneach account screens do not expose language or dialect preferences.
   */
  @OneToMany('LanguageSetting', 'user')
  languageSettings!: LanguageSetting[];

  /**
   * Magic links issued to this user for passwordless login.
   * Each magic link includes a token and expiry date.
   */
  @OneToMany('MagicLink', 'user')
  magicLinks!: MagicLink[];
}
