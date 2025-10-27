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
    // NOTE: This function will be updated by the RefactorFactSupportToNeutralRelationship migration
    // to use the correct table name (fact_links instead of fact_support)
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION decouple_fact_relationships_on_corpus_change()
      RETURNS TRIGGER AS $$
      BEGIN
        IF OLD.corpus_id IS DISTINCT FROM NEW.corpus_id THEN
          -- Remove all fact link relationships for this fact
          -- Use fact_links table (created in InitialSchema migration)
          DELETE FROM fact_links WHERE fact_id_a = NEW.id OR fact_id_b = NEW.id;
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

    // NOTE: validate_fact_support function and trigger are created by
    // the RefactorFactSupportToNeutralRelationship migration

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
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop triggers first
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trigger_validate_fact_basis ON facts;`,
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trigger_decouple_fact_relationships_on_corpus_change ON facts;`,
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS trigger_set_fact_state_on_empty_statement ON facts;`,
    );

    // Drop functions (but not validate_fact_support - that's owned by RefactorFactSupportToNeutralRelationship)
    await queryRunner.query(`DROP FUNCTION IF EXISTS validate_fact_basis();`);
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS decouple_fact_relationships_on_corpus_change();`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS set_fact_state_on_empty_statement();`,
    );
  }
}
