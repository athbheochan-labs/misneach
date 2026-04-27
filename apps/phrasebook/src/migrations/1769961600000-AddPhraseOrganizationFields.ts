import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPhraseOrganizationFields1769961600000
  implements MigrationInterface
{
  name = 'AddPhraseOrganizationFields1769961600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE TABLE `phrase_categories` (`id` int NOT NULL AUTO_INCREMENT, `clientId` varchar(255) NOT NULL, `name` varchar(100) NOT NULL, `createdAt` timestamp NOT NULL, `archivedAt` timestamp NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_phrase_categories_client_name` ON `phrase_categories` (`clientId`, `name`)',
    );
    await queryRunner.query(
      'CREATE TABLE `phrase_groups` (`id` int NOT NULL AUTO_INCREMENT, `clientId` varchar(255) NOT NULL, `categoryId` int NOT NULL, `name` varchar(150) NOT NULL, `createdAt` timestamp NOT NULL, `archivedAt` timestamp NULL, PRIMARY KEY (`id`)) ENGINE=InnoDB',
    );
    await queryRunner.query(
      'CREATE UNIQUE INDEX `IDX_phrase_groups_client_category_name` ON `phrase_groups` (`clientId`, `categoryId`, `name`)',
    );
    await queryRunner.query(
      'ALTER TABLE `phrases` ADD `categoryId` int NULL',
    );
    await queryRunner.query(
      'ALTER TABLE `phrases` ADD `groupId` int NULL',
    );
    await queryRunner.query(
      'ALTER TABLE `phrase_groups` ADD CONSTRAINT `FK_phrase_groups_category` FOREIGN KEY (`categoryId`) REFERENCES `phrase_categories`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE `phrases` ADD CONSTRAINT `FK_phrases_category` FOREIGN KEY (`categoryId`) REFERENCES `phrase_categories`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION',
    );
    await queryRunner.query(
      'ALTER TABLE `phrases` ADD CONSTRAINT `FK_phrases_group` FOREIGN KEY (`groupId`) REFERENCES `phrase_groups`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE `phrases` DROP FOREIGN KEY `FK_phrases_group`');
    await queryRunner.query('ALTER TABLE `phrases` DROP FOREIGN KEY `FK_phrases_category`');
    await queryRunner.query('ALTER TABLE `phrase_groups` DROP FOREIGN KEY `FK_phrase_groups_category`');
    await queryRunner.query('ALTER TABLE `phrases` DROP COLUMN `groupId`');
    await queryRunner.query('ALTER TABLE `phrases` DROP COLUMN `categoryId`');
    await queryRunner.query('DROP INDEX `IDX_phrase_groups_client_category_name` ON `phrase_groups`');
    await queryRunner.query('DROP TABLE `phrase_groups`');
    await queryRunner.query('DROP INDEX `IDX_phrase_categories_client_name` ON `phrase_categories`');
    await queryRunner.query('DROP TABLE `phrase_categories`');
  }
}
