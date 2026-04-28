import { MigrationInterface, QueryRunner } from 'typeorm';

export class BackfillPhraseOrganizationLinks1772246400000
  implements MigrationInterface
{
  name = 'BackfillPhraseOrganizationLinks1772246400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const legacyColumns = (await queryRunner.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'phrases'
        AND COLUMN_NAME IN ('category', 'groupName')
    `)) as Array<{ COLUMN_NAME: string }>;

    const availableColumns = new Set(
      legacyColumns.map((column) => column.COLUMN_NAME),
    );

    if (availableColumns.has('category')) {
      await queryRunner.query(`
        INSERT INTO phrase_categories (clientId, name, createdAt, archivedAt)
        SELECT DISTINCT p.clientId, p.category, NOW(), NULL
        FROM phrases p
        WHERE p.category IS NOT NULL
          AND TRIM(p.category) <> ''
          AND NOT EXISTS (
            SELECT 1
            FROM phrase_categories pc
            WHERE pc.clientId = p.clientId
              AND pc.name = p.category
          )
      `);

      await queryRunner.query(`
        UPDATE phrases p
        INNER JOIN phrase_categories pc
          ON pc.clientId = p.clientId
         AND pc.name = p.category
        SET p.categoryId = pc.id
        WHERE p.categoryId IS NULL
          AND p.category IS NOT NULL
          AND TRIM(p.category) <> ''
      `);
    }

    if (availableColumns.has('groupName')) {
      await queryRunner.query(`
        INSERT INTO phrase_groups (clientId, categoryId, name, createdAt, archivedAt)
        SELECT DISTINCT p.clientId, p.categoryId, p.groupName, NOW(), NULL
        FROM phrases p
        WHERE p.groupName IS NOT NULL
          AND TRIM(p.groupName) <> ''
          AND p.categoryId IS NOT NULL
          AND NOT EXISTS (
            SELECT 1
            FROM phrase_groups pg
            WHERE pg.clientId = p.clientId
              AND pg.categoryId = p.categoryId
              AND pg.name = p.groupName
          )
      `);

      await queryRunner.query(`
        UPDATE phrases p
        INNER JOIN phrase_groups pg
          ON pg.clientId = p.clientId
         AND pg.categoryId = p.categoryId
         AND pg.name = p.groupName
        SET p.groupId = pg.id
        WHERE p.groupId IS NULL
          AND p.groupName IS NOT NULL
          AND TRIM(p.groupName) <> ''
          AND p.categoryId IS NOT NULL
      `);
    }
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Backfill is intentionally irreversible.
  }
}
