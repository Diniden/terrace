import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFactContextValidationTriggers1729519300000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create function to validate fact context rules
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION validate_fact_context()
      RETURNS TRIGGER AS $$
      DECLARE
        parent_corpus_id UUID;
        basis_context facts_context_enum;
      BEGIN
        -- Rule 1 & 2: CORPUS_GLOBAL and CORPUS_BUILDER facts must have null basis_id
        IF (NEW.context = 'corpus_global' OR NEW.context = 'corpus_builder')
           AND NEW.basis_id IS NOT NULL THEN
          RAISE EXCEPTION 'Facts with context ''%'' must have null basis_id', NEW.context;
        END IF;

        -- Rule 3: CORPUS_KNOWLEDGE facts with basis_id must follow specific rules
        IF NEW.context = 'corpus_knowledge' AND NEW.basis_id IS NOT NULL THEN
          -- Get the parent corpus_id for the current fact's corpus
          SELECT basis_corpus_id INTO parent_corpus_id
          FROM corpuses
          WHERE id = NEW.corpus_id;

          -- Check if parent corpus exists (if no parent, basis_id should be null)
          IF parent_corpus_id IS NULL THEN
            RAISE EXCEPTION 'Fact with context ''corpus_knowledge'' cannot have a basis_id when its corpus has no parent corpus';
          END IF;

          -- Get the context of the basis fact
          SELECT context INTO basis_context
          FROM facts
          WHERE id = NEW.basis_id;

          -- Check if basis fact exists
          IF basis_context IS NULL THEN
            RAISE EXCEPTION 'Basis fact does not exist';
          END IF;

          -- Validate basis fact has context='corpus_knowledge'
          IF basis_context != 'corpus_knowledge' THEN
            RAISE EXCEPTION 'Basis fact must have context ''corpus_knowledge'', but has ''%''', basis_context;
          END IF;

          -- Validate basis fact belongs to parent corpus
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

    // Create trigger for validating fact context
    await queryRunner.query(`
      CREATE TRIGGER trigger_validate_fact_context
      BEFORE INSERT OR UPDATE ON facts
      FOR EACH ROW
      EXECUTE FUNCTION validate_fact_context();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop trigger first
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trigger_validate_fact_context ON facts;
    `);

    // Drop function
    await queryRunner.query(`
      DROP FUNCTION IF EXISTS validate_fact_context();
    `);
  }
}
