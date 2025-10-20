import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTriggers1700000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
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
  }
}
