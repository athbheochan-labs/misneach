import { MigrationInterface, QueryRunner } from 'typeorm';

export class NormalizePhraseSourceAttribution1769875200000
  implements MigrationInterface
{
  name = 'NormalizePhraseSourceAttribution1769875200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE phrases
      SET source = 'manual'
      WHERE LOWER(TRIM(source)) IN (
        'manual',
        'own',
        'user',
        'user_added',
        'custom',
        'personal',
        'direct_input',
        'manual_input'
      )
    `);

    await queryRunner.query(`
      UPDATE phrases
      SET source = 'course'
      WHERE LOWER(TRIM(source)) IN (
        'course',
        'nlp',
        'lesson',
        'course_phrase',
        'lexicon',
        'import'
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE phrases
      SET source = 'own'
      WHERE source = 'manual'
    `);

    await queryRunner.query(`
      UPDATE phrases
      SET source = 'nlp'
      WHERE source = 'course'
    `);
  }
}
