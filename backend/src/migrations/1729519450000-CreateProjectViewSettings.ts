import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProjectViewSettings1729519450000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create project_view_settings table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS project_view_settings (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL,
        project_id UUID NOT NULL,
        settings JSONB NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT fk_project_view_settings_user
          FOREIGN KEY (user_id)
          REFERENCES users(id)
          ON DELETE CASCADE,
        CONSTRAINT fk_project_view_settings_project
          FOREIGN KEY (project_id)
          REFERENCES projects(id)
          ON DELETE CASCADE
      );
    `);

    // Create unique index on user_id + project_id combination
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_project_view_settings_user_project
      ON project_view_settings (user_id, project_id);
    `);

    // Create index on user_id for efficient user-based queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_project_view_settings_user
      ON project_view_settings (user_id);
    `);

    // Create index on project_id for efficient project-based queries
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_project_view_settings_project
      ON project_view_settings (project_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes first
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_project_view_settings_project;`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_project_view_settings_user;`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS idx_project_view_settings_user_project;`,
    );

    // Drop table
    await queryRunner.query(`DROP TABLE IF EXISTS project_view_settings;`);
  }
}
