import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmbeddingMetadataToFacts1729519600000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create the enum type for embedding status
    await queryRunner.query(`
      CREATE TYPE facts_embedding_status_enum AS ENUM (
        'pending',
        'embedded',
        'failed'
      );
    `);

    // Add embedding_status column with default value
    await queryRunner.query(`
      ALTER TABLE facts
      ADD COLUMN embedding_status facts_embedding_status_enum NOT NULL DEFAULT 'pending';
    `);

    // Add last_embedded_at timestamp column
    await queryRunner.query(`
      ALTER TABLE facts
      ADD COLUMN last_embedded_at TIMESTAMP NULL;
    `);

    // Add embedding_version column for tracking model version
    await queryRunner.query(`
      ALTER TABLE facts
      ADD COLUMN embedding_version VARCHAR(100) NULL;
    `);

    // Add embedding_model column for tracking provider/model
    await queryRunner.query(`
      ALTER TABLE facts
      ADD COLUMN embedding_model VARCHAR(100) NULL;
    `);

    // Create index on embedding_status for efficient querying of pending facts
    await queryRunner.query(`
      CREATE INDEX "IDX_facts_embedding_status" ON facts(embedding_status);
    `);

    // Update existing facts:
    // - If statement is not null/empty, mark as pending for embedding
    // - If statement is null/empty, leave as pending (will be skipped by embedding service)
    await queryRunner.query(`
      UPDATE facts
      SET embedding_status = 'pending'
      WHERE statement IS NOT NULL AND statement != '';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index first
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_facts_embedding_status";
    `);

    // Drop columns
    await queryRunner.query(`
      ALTER TABLE facts
      DROP COLUMN IF EXISTS embedding_model;
    `);

    await queryRunner.query(`
      ALTER TABLE facts
      DROP COLUMN IF EXISTS embedding_version;
    `);

    await queryRunner.query(`
      ALTER TABLE facts
      DROP COLUMN IF EXISTS last_embedded_at;
    `);

    await queryRunner.query(`
      ALTER TABLE facts
      DROP COLUMN IF EXISTS embedding_status;
    `);

    // Drop the enum type
    await queryRunner.query(`
      DROP TYPE IF EXISTS facts_embedding_status_enum;
    `);
  }
}
