import { MigrationInterface, QueryRunner } from 'typeorm';

export class RefactorFactSupportToNeutralRelationship1730000000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Update trigger functions FIRST to use neutral naming
    // This ensures triggers continue to work during table rename

    // Update decouple_fact_relationships_on_corpus_change trigger function
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION decouple_fact_relationships_on_corpus_change()
      RETURNS TRIGGER AS $$
      BEGIN
        IF OLD.corpus_id IS DISTINCT FROM NEW.corpus_id THEN
          -- Remove all fact link relationships for this fact
          DELETE FROM fact_support WHERE fact_id_a = NEW.id OR fact_id_b = NEW.id;
          -- Clear basis
          NEW.basis_id = NULL;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Update validate_fact_support_composite trigger function with neutral naming
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION validate_fact_support_composite()
      RETURNS TRIGGER AS $$
      DECLARE
        fact_a_corpus_id UUID;
        fact_b_corpus_id UUID;
        fact_a_context facts_context_enum;
        fact_b_context facts_context_enum;
      BEGIN
        -- Get corpus_id and context for both facts
        -- Note: We treat fact_id_a and fact_id_b as neutral positions (no directionality implied)
        SELECT corpus_id, context INTO fact_a_corpus_id, fact_a_context
        FROM facts WHERE id = NEW.fact_id_a;

        SELECT corpus_id, context INTO fact_b_corpus_id, fact_b_context
        FROM facts WHERE id = NEW.fact_id_b;

        -- Validate both facts exist
        IF fact_a_corpus_id IS NULL THEN
          RAISE EXCEPTION 'Fact A (fact_id_a) does not exist';
        END IF;

        IF fact_b_corpus_id IS NULL THEN
          RAISE EXCEPTION 'Fact B (fact_id_b) does not exist';
        END IF;

        -- Validate same corpus
        IF fact_a_corpus_id IS DISTINCT FROM fact_b_corpus_id THEN
          RAISE EXCEPTION 'Link relationship must be between facts in the same corpus';
        END IF;

        -- Validate same context
        IF fact_a_context != fact_b_context THEN
          RAISE EXCEPTION 'Link relationship must be between facts with the same context. Fact A has context ''%'', Fact B has context ''%''',
            fact_a_context, fact_b_context;
        END IF;

        -- Prevent self-linking
        IF NEW.fact_id_a = NEW.fact_id_b THEN
          RAISE EXCEPTION 'A fact cannot link to itself';
        END IF;

        -- Prevent duplicate links (bidirectional check)
        -- Since links are bidirectional, (A,B) is same as (B,A)
        IF EXISTS (
          SELECT 1 FROM fact_links
          WHERE (fact_id_a = NEW.fact_id_b AND fact_id_b = NEW.fact_id_a)
        ) THEN
          RAISE EXCEPTION 'This link relationship already exists in reverse direction';
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Step 2: Rename columns in fact_support table (if not already renamed)
    // We use fact_id_a and fact_id_b to show bidirectional, non-directional relationship

    // Check if we need to perform the rename operation
    const factSupportExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'fact_support'
      ) as exists;
    `);

    const factLinksExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'fact_links'
      ) as exists;
    `);

    // Only rename if fact_support exists AND fact_links doesn't exist
    if (factSupportExists[0].exists && !factLinksExists[0].exists) {
      // Check if columns need to be renamed
      const hasOldColumns = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_schema = 'public'
          AND table_name = 'fact_support'
          AND column_name = 'fact_id'
        ) as exists;
      `);

      if (hasOldColumns[0].exists) {
        await queryRunner.query(`
          ALTER TABLE fact_support RENAME COLUMN fact_id TO fact_id_a;
        `);

        await queryRunner.query(`
          ALTER TABLE fact_support RENAME COLUMN support_id TO fact_id_b;
        `);
      }

      // Step 3: Rename the table to reflect neutral relationship naming
      await queryRunner.query(`
        ALTER TABLE fact_support RENAME TO fact_links;
      `);
    }

    // Step 4: Recreate constraints and indexes with new table and column names

    // Drop old constraints (they were auto-renamed by PostgreSQL during column rename)
    await queryRunner.query(`
      ALTER TABLE fact_links DROP CONSTRAINT IF EXISTS "FK_fact_support_fact_id";
    `);

    await queryRunner.query(`
      ALTER TABLE fact_links DROP CONSTRAINT IF EXISTS "FK_fact_support_support_id";
    `);

    // Recreate foreign key constraints with neutral names (if not exists)
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE fact_links
        ADD CONSTRAINT "FK_fact_links_fact_id_a"
        FOREIGN KEY (fact_id_a) REFERENCES facts(id) ON DELETE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE fact_links
        ADD CONSTRAINT "FK_fact_links_fact_id_b"
        FOREIGN KEY (fact_id_b) REFERENCES facts(id) ON DELETE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Drop old indexes (auto-renamed during column rename)
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_fact_support_fact_id";
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_fact_support_support_id";
    `);

    // Recreate indexes with neutral names (if not exists)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_fact_links_fact_id_a" ON fact_links(fact_id_a);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_fact_links_fact_id_b" ON fact_links(fact_id_b);
    `);

    // Step 5: Update trigger to reference new table name
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trigger_validate_fact_support ON fact_links;
    `);

    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trigger_validate_fact_links ON fact_links;
    `);

    await queryRunner.query(`
      CREATE TRIGGER trigger_validate_fact_links
      BEFORE INSERT OR UPDATE ON fact_links
      FOR EACH ROW
      EXECUTE FUNCTION validate_fact_support_composite();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback in reverse order

    // Check if fact_links table exists
    const factLinksExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'fact_links'
      ) as exists;
    `);

    const factSupportExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'fact_support'
      ) as exists;
    `);

    if (!factLinksExists[0].exists) {
      // Migration wasn't fully applied, nothing to revert
      return;
    }

    // Step 1: Drop the new trigger
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trigger_validate_fact_links ON fact_links;
    `);

    // Step 2: Drop indexes
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_fact_links_fact_id_b";
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_fact_links_fact_id_a";
    `);

    // Step 3: Drop foreign key constraints
    await queryRunner.query(`
      ALTER TABLE fact_links DROP CONSTRAINT IF EXISTS "FK_fact_links_fact_id_b";
    `);

    await queryRunner.query(`
      ALTER TABLE fact_links DROP CONSTRAINT IF EXISTS "FK_fact_links_fact_id_a";
    `);

    // Step 4: Only rename table if fact_support doesn't already exist
    if (!factSupportExists[0].exists) {
      await queryRunner.query(`
        ALTER TABLE fact_links RENAME TO fact_support;
      `);

      // Step 5: Rename columns back
      await queryRunner.query(`
        ALTER TABLE fact_support RENAME COLUMN fact_id_b TO support_id;
      `);

      await queryRunner.query(`
        ALTER TABLE fact_support RENAME COLUMN fact_id_a TO fact_id;
      `);
    } else {
      // If fact_support already exists, drop fact_links instead
      await queryRunner.query(`
        DROP TABLE IF EXISTS fact_links;
      `);
    }

    // Step 6: Recreate old constraints
    await queryRunner.query(`
      ALTER TABLE fact_support
      ADD CONSTRAINT "FK_fact_support_fact_id"
      FOREIGN KEY (fact_id) REFERENCES facts(id) ON DELETE CASCADE;
    `);

    await queryRunner.query(`
      ALTER TABLE fact_support
      ADD CONSTRAINT "FK_fact_support_support_id"
      FOREIGN KEY (support_id) REFERENCES facts(id) ON DELETE CASCADE;
    `);

    // Step 7: Recreate old indexes
    await queryRunner.query(`
      CREATE INDEX "IDX_fact_support_fact_id" ON fact_support(fact_id);
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_fact_support_support_id" ON fact_support(support_id);
    `);

    // Step 8: Recreate old trigger
    await queryRunner.query(`
      CREATE TRIGGER trigger_validate_fact_support
      BEFORE INSERT OR UPDATE ON fact_support
      FOR EACH ROW
      EXECUTE FUNCTION validate_fact_support_composite();
    `);

    // Step 9: Restore original trigger function (with directional naming)
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION validate_fact_support_composite()
      RETURNS TRIGGER AS $$
      DECLARE
        supporting_corpus_id UUID;
        supported_corpus_id UUID;
        supporting_fact_context facts_context_enum;
        supported_fact_context facts_context_enum;
      BEGIN
        -- Get corpus_id and context for both facts
        SELECT corpus_id, context INTO supporting_corpus_id, supporting_fact_context
        FROM facts WHERE id = NEW.support_id;

        SELECT corpus_id, context INTO supported_corpus_id, supported_fact_context
        FROM facts WHERE id = NEW.fact_id;

        -- Validate both facts exist
        IF supporting_corpus_id IS NULL THEN
          RAISE EXCEPTION 'Supporting fact (support_id) does not exist';
        END IF;

        IF supported_corpus_id IS NULL THEN
          RAISE EXCEPTION 'Supported fact (fact_id) does not exist';
        END IF;

        -- Validate same corpus
        IF supporting_corpus_id IS DISTINCT FROM supported_corpus_id THEN
          RAISE EXCEPTION 'Support relationship must be between facts in the same corpus';
        END IF;

        -- Validate same context
        IF supporting_fact_context != supported_fact_context THEN
          RAISE EXCEPTION 'Support relationship must be between facts with the same context. Supporting fact has context ''%'', supported fact has context ''%''',
            supporting_fact_context, supported_fact_context;
        END IF;

        -- Prevent self-support
        IF NEW.fact_id = NEW.support_id THEN
          RAISE EXCEPTION 'A fact cannot support itself';
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Step 10: Restore original decouple function
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION decouple_fact_relationships_on_corpus_change()
      RETURNS TRIGGER AS $$
      BEGIN
        IF OLD.corpus_id IS DISTINCT FROM NEW.corpus_id THEN
          -- Remove support relationships where this fact supports others
          DELETE FROM fact_support WHERE fact_id = NEW.id;
          -- Remove support relationships where this fact is supported
          DELETE FROM fact_support WHERE support_id = NEW.id;
          -- Clear basis
          NEW.basis_id = NULL;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
  }
}
