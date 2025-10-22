import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateChatMessages1729519500000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE chat_messages (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId" UUID NOT NULL,
        content TEXT NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT fk_chat_messages_user
          FOREIGN KEY ("userId")
          REFERENCES users(id)
          ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_chat_messages_user_created
      ON chat_messages ("userId", "createdAt");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_chat_messages_user_created;`);
    await queryRunner.query(`DROP TABLE IF EXISTS chat_messages;`);
  }
}
