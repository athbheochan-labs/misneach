import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCourseAdminLifecycleTables1770200000000 implements MigrationInterface {
  name = 'AddCourseAdminLifecycleTables1770200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "CREATE TABLE `course_drafts` (`id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, `courseSlug` varchar(128) NOT NULL, `courseTitle` varchar(255) NOT NULL, `lang` varchar(12) NOT NULL DEFAULT 'ga', `summary` text NULL, `updatedByUserId` int NULL, `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX `idx_course_drafts_slug_unique` (`courseSlug`), PRIMARY KEY (`id`)) ENGINE=InnoDB",
    );

    await queryRunner.query(
      "CREATE TABLE `lesson_drafts` (`id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, `courseSlug` varchar(128) NOT NULL, `lessonSlug` varchar(128) NOT NULL, `lessonTitle` varchar(255) NOT NULL, `moduleKey` varchar(128) NULL, `moduleName` varchar(255) NULL, `unitKey` varchar(128) NULL, `unitName` varchar(255) NULL, `group` varchar(128) NULL, `order` int NOT NULL DEFAULT '1', `lang` varchar(12) NOT NULL DEFAULT 'ga', `estimatedMinutes` int NOT NULL DEFAULT '10', `summary` text NULL, `tagsJson` longtext NULL, `markdown` longtext NOT NULL, `lessonJson` longtext NULL, `contentVersion` varchar(64) NULL, `validationErrorsJson` longtext NULL, `isValid` tinyint NOT NULL DEFAULT '0', `revision` int UNSIGNED NOT NULL DEFAULT '1', `updatedByUserId` int NULL, `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX `idx_lesson_drafts_course_lesson_unique` (`courseSlug`, `lessonSlug`), INDEX `idx_lesson_drafts_course_order` (`courseSlug`, `order`), PRIMARY KEY (`id`)) ENGINE=InnoDB",
    );

    await queryRunner.query(
      "CREATE TABLE `course_releases` (`id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, `contentVersion` varchar(64) NOT NULL, `status` enum ('candidate', 'published') NOT NULL DEFAULT 'candidate', `label` varchar(191) NULL, `manifestJson` longtext NOT NULL, `createdByUserId` int NULL, `publishedByUserId` int NULL, `publishedAt` datetime NULL, `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), INDEX `idx_course_releases_status_created` (`status`, `createdAt`), PRIMARY KEY (`id`)) ENGINE=InnoDB",
    );

    await queryRunner.query(
      "CREATE TABLE `course_release_lessons` (`id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, `releaseId` bigint UNSIGNED NOT NULL, `courseSlug` varchar(128) NOT NULL, `lessonSlug` varchar(128) NOT NULL, `contentVersion` varchar(64) NOT NULL, `lessonJson` longtext NOT NULL, `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), UNIQUE INDEX `idx_course_release_lessons_release_course_lesson_unique` (`releaseId`, `courseSlug`, `lessonSlug`), INDEX `idx_course_release_lessons_release` (`releaseId`), PRIMARY KEY (`id`)) ENGINE=InnoDB",
    );

    await queryRunner.query(
      "CREATE TABLE `course_active_release` (`id` tinyint UNSIGNED NOT NULL DEFAULT '1', `releaseId` bigint UNSIGNED NOT NULL, `updatedByUserId` int NULL, `updatedAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), PRIMARY KEY (`id`)) ENGINE=InnoDB",
    );

    await queryRunner.query(
      "CREATE TABLE `admin_audit_log` (`id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, `actorUserId` int NULL, `action` varchar(80) NOT NULL, `targetType` varchar(80) NOT NULL, `targetId` varchar(191) NOT NULL, `beforeHash` varchar(64) NULL, `afterHash` varchar(64) NULL, `metadataJson` longtext NULL, `createdAt` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX `idx_admin_audit_actor_created` (`actorUserId`, `createdAt`), INDEX `idx_admin_audit_target_created` (`targetType`, `targetId`, `createdAt`), PRIMARY KEY (`id`)) ENGINE=InnoDB",
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE `admin_audit_log`');
    await queryRunner.query('DROP TABLE `course_active_release`');
    await queryRunner.query('DROP TABLE `course_release_lessons`');
    await queryRunner.query('DROP TABLE `course_releases`');
    await queryRunner.query('DROP TABLE `lesson_drafts`');
    await queryRunner.query('DROP TABLE `course_drafts`');
  }
}
