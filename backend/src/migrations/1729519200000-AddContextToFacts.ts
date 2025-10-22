import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddContextToFacts1729519200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create the enum type
    await queryRunner.query(`
      CREATE TYPE facts_context_enum AS ENUM (
        'corpus_global',
        'corpus_builder',
        'corpus_knowledge'
      );
    `);

    // Add the context column with default value
    await queryRunner.query(`
      ALTER TABLE facts
      ADD COLUMN context facts_context_enum NOT NULL DEFAULT 'corpus_knowledge';
    `);

    // Update all existing facts to have context = 'corpus_knowledge'
    await queryRunner.query(`
      UPDATE facts
      SET context = 'corpus_knowledge'
      WHERE context IS NULL;
    `);

    // Create index on context column
    await queryRunner.query(`
      CREATE INDEX "IDX_facts_context" ON facts(context);
    `);

    // Create composite index on (corpus_id, context)
    await queryRunner.query(`
      CREATE INDEX "IDX_facts_corpus_id_context" ON facts(corpus_id, context);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes first
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_facts_corpus_id_context";
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_facts_context";
    `);

    // Drop the context column
    await queryRunner.query(`
      ALTER TABLE facts
      DROP COLUMN IF EXISTS context;
    `);

    // Drop the enum type
    await queryRunner.query(`
      DROP TYPE IF EXISTS facts_context_enum;
    `);
  }
}
