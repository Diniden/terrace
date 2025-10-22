import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFactSupportContextValidationTriggers1729519400000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create function to validate fact support relationships respect context constraints
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION validate_fact_support_context()
      RETURNS TRIGGER AS $$
      DECLARE
        supporting_fact_context facts_context_enum;
        supported_fact_context facts_context_enum;
      BEGIN
        -- Get context for the supporting fact (the fact that supports another)
        SELECT context INTO supporting_fact_context
        FROM facts
        WHERE id = NEW.support_id;

        -- Get context for the supported fact (the fact being supported)
        SELECT context INTO supported_fact_context
        FROM facts
        WHERE id = NEW.fact_id;

        -- Validate both facts exist
        IF supporting_fact_context IS NULL THEN
          RAISE EXCEPTION 'Supporting fact (support_id) does not exist';
        END IF;

        IF supported_fact_context IS NULL THEN
          RAISE EXCEPTION 'Supported fact (fact_id) does not exist';
        END IF;

        -- Rule: Support relationships can ONLY occur between facts with the SAME context
        IF supporting_fact_context != supported_fact_context THEN
          RAISE EXCEPTION 'Support relationship must be between facts with the same context. Supporting fact has context ''%'', supported fact has context ''%''',
            supporting_fact_context, supported_fact_context;
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Drop the old trigger if it exists and recreate with updated function
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trigger_validate_fact_support ON fact_support;
    `);

    // Create new composite trigger that validates both corpus and context
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

    // Create trigger for validating fact support with context constraints
    await queryRunner.query(`
      CREATE TRIGGER trigger_validate_fact_support
      BEFORE INSERT OR UPDATE ON fact_support
      FOR EACH ROW
      EXECUTE FUNCTION validate_fact_support_composite();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the composite trigger
    await queryRunner.query(`
      DROP TRIGGER IF EXISTS trigger_validate_fact_support ON fact_support;
    `);

    // Drop composite function
    await queryRunner.query(`
      DROP FUNCTION IF EXISTS validate_fact_support_composite();
    `);

    // Drop context validation function
    await queryRunner.query(`
      DROP FUNCTION IF EXISTS validate_fact_support_context();
    `);

    // Recreate the original trigger from the first migration
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

    await queryRunner.query(`
      CREATE TRIGGER trigger_validate_fact_support
      BEFORE INSERT OR UPDATE ON fact_support
      FOR EACH ROW
      EXECUTE FUNCTION validate_fact_support();
    `);
  }
}
