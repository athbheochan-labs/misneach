import { MigrationInterface, QueryRunner } from "typeorm";

export class AddProfileFieldsToUserWordStatistics1768482000000 implements MigrationInterface {
    name = 'AddProfileFieldsToUserWordStatistics1768482000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`user_word_statistics\` ADD \`lastSeenAt\` timestamp NULL`);
        await queryRunner.query(`ALTER TABLE \`user_word_statistics\` ADD \`priorityScore\` float NOT NULL DEFAULT '0'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`user_word_statistics\` DROP COLUMN \`priorityScore\``);
        await queryRunner.query(`ALTER TABLE \`user_word_statistics\` DROP COLUMN \`lastSeenAt\``);
    }
}
