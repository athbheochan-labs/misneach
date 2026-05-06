import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPhrasebookRoutingFlags1769671200000
  implements MigrationInterface
{
  name = 'AddPhrasebookRoutingFlags1769671200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE `phrases` ADD `inPractice` tinyint NOT NULL DEFAULT 0',
    );
    await queryRunner.query(
      'ALTER TABLE `phrases` ADD `inFlashcards` tinyint NOT NULL DEFAULT 0',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `phrases` DROP COLUMN `inFlashcards`');
    await queryRunner.query('ALTER TABLE `phrases` DROP COLUMN `inPractice`');
  }
}
