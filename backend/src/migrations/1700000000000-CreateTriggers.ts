import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTriggers1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create function to set fact state based on statement
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION set_fact_state_on_empty_statement()
      RETURNS TRIGGER AS $$
      BEGIN
        IF NEW.statement IS NULL OR NEW.statement = '' THEN
          NEW.state = 'clarify';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Create function to decouple relationships when corpus changes
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

    // Create function to validate fact basis
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION validate_fact_basis()
      RETURNS TRIGGER AS $$
      DECLARE
        parent_corpus_id UUID;
      BEGIN
        IF NEW.basis_id IS NOT NULL THEN
          -- Get the parent corpus_id for the current fact's corpus
          SELECT basis_corpus_id INTO parent_corpus_id
          FROM corpuses
          WHERE id = NEW.corpus_id;

          -- Check if basis fact exists and belongs to parent corpus
          IF NOT EXISTS (
            SELECT 1 FROM facts
            WHERE id = NEW.basis_id
            AND corpus_id = parent_corpus_id
          ) THEN
            RAISE EXCEPTION 'Basis fact must belong to the parent corpus';
          END IF;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Create function to validate fact support relationships
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION validate_fact_support()
      RETURNS TRIGGER AS $$
      DECLARE
        supporting_corpus_id UUID;
        supported_corpus_id UUID;
      BEGIN
        -- Get corpus_id for both facts
        SELECT corpus_id INTO supporting_corpus_id
        FROM facts WHERE id = NEW.fact_id;

        SELECT corpus_id INTO supported_corpus_id
        FROM facts WHERE id = NEW.support_id;

        -- Validate same corpus
        IF supporting_corpus_id IS DISTINCT FROM supported_corpus_id THEN
          RAISE EXCEPTION 'Support relationship must be between facts in the same corpus';
        END IF;

        -- Prevent self-support
        IF NEW.fact_id = NEW.support_id THEN
          RAISE EXCEPTION 'A fact cannot support itself';
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Create trigger for automatic fact state management
    await queryRunner.query(`
      CREATE TRIGGER trigger_set_fact_state_on_empty_statement
      BEFORE INSERT OR UPDATE ON facts
      FOR EACH ROW
      EXECUTE FUNCTION set_fact_state_on_empty_statement();
    `);

    // Create trigger for decoupling relationships on corpus change
    await queryRunner.query(`
      CREATE TRIGGER trigger_decouple_fact_relationships_on_corpus_change
      BEFORE UPDATE ON facts
      FOR EACH ROW
      EXECUTE FUNCTION decouple_fact_relationships_on_corpus_change();
    `);

    // Create trigger for validating fact basis
    await queryRunner.query(`
      CREATE TRIGGER trigger_validate_fact_basis
      BEFORE INSERT OR UPDATE ON facts
      FOR EACH ROW
      EXECUTE FUNCTION validate_fact_basis();
    `);

    // Create trigger for validating fact support relationships
    await queryRunner.query(`
      CREATE TRIGGER trigger_validate_fact_support
      BEFORE INSERT OR UPDATE ON fact_support
      FOR EACH ROW
      EXECUTE FUNCTION validate_fact_support();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop triggers first
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trigger_validate_fact_support ON fact_support;`,
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trigger_validate_fact_basis ON facts;`,
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trigger_decouple_fact_relationships_on_corpus_change ON facts;`,
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trigger_set_fact_state_on_empty_statement ON facts;`,
    );

    // Drop functions
    await queryRunner.query(`DROP FUNCTION IF EXISTS validate_fact_support();`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS validate_fact_basis();`);
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS decouple_fact_relationships_on_corpus_change();`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS set_fact_state_on_empty_statement();`,
    );
  }
}
