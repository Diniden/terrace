import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1699000000000 implements MigrationInterface {
    name = 'InitialSchema1699000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."facts_state_enum" AS ENUM('clarify', 'conflict', 'ready', 'rejected', 'confirmed')`);
        await queryRunner.query(`CREATE TABLE "facts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "statement" character varying, "corpus_id" uuid NOT NULL, "basis_id" uuid, "state" "public"."facts_state_enum" NOT NULL DEFAULT 'clarify', "meta" jsonb, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_b35218a44dc3d5dd2f0f54d7e3f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_324caa13d2c08921bd1feec1fc" ON "facts" ("basis_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_b3638a28211b137e5df4f51bb8" ON "facts" ("corpus_id") `);
        await queryRunner.query(`CREATE TABLE "corpuses" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "description" character varying, "project_id" uuid NOT NULL, "basis_corpus_id" uuid, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_0de0f25dadf629b3cd5724c04c8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_3b147d85ec03a7007f7092cc87" ON "corpuses" ("project_id") `);
        await queryRunner.query(`CREATE TYPE "public"."project_members_role_enum" AS ENUM('owner', 'admin', 'maintainer', 'contributor', 'viewer')`);
        await queryRunner.query(`CREATE TABLE "project_members" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "project_id" uuid NOT NULL, "user_id" uuid NOT NULL, "role" "public"."project_members_role_enum" NOT NULL DEFAULT 'viewer', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_0b2f46f804be4aea9234c78bcc9" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_b3f491d3a3f986106d281d8eb4" ON "project_members" ("project_id", "user_id") `);
        await queryRunner.query(`CREATE TABLE "projects" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "description" character varying, "owner_id" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6271df0a7aed1d6c0691ce6ac50" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."users_applicationrole_enum" AS ENUM('admin', 'user')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "password" character varying NOT NULL, "applicationRole" "public"."users_applicationrole_enum" NOT NULL DEFAULT 'user', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users" ("email") `);
        await queryRunner.query(`CREATE TABLE "fact_links" ("fact_id_a" uuid NOT NULL, "fact_id_b" uuid NOT NULL, CONSTRAINT "PK_388add08241f705ce5d81f57001" PRIMARY KEY ("fact_id_a", "fact_id_b"))`);
        await queryRunner.query(`CREATE INDEX "IDX_40e04149976ac01006c346a138" ON "fact_links" ("fact_id_a") `);
        await queryRunner.query(`CREATE INDEX "IDX_bd6f0bafb5084b195aa7533d97" ON "fact_links" ("fact_id_b") `);
        await queryRunner.query(`ALTER TABLE "facts" ADD CONSTRAINT "FK_b3638a28211b137e5df4f51bb84" FOREIGN KEY ("corpus_id") REFERENCES "corpuses"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "facts" ADD CONSTRAINT "FK_324caa13d2c08921bd1feec1fca" FOREIGN KEY ("basis_id") REFERENCES "facts"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "corpuses" ADD CONSTRAINT "FK_3b147d85ec03a7007f7092cc879" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "corpuses" ADD CONSTRAINT "FK_934c586c0be9daf4f626ce0feac" FOREIGN KEY ("basis_corpus_id") REFERENCES "corpuses"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "project_members" ADD CONSTRAINT "FK_b5729113570c20c7e214cf3f58d" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "project_members" ADD CONSTRAINT "FK_e89aae80e010c2faa72e6a49ce8" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "projects" ADD CONSTRAINT "FK_b1bd2fbf5d0ef67319c91acb5cf" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "fact_links" ADD CONSTRAINT "FK_40e04149976ac01006c346a1387" FOREIGN KEY ("fact_id_a") REFERENCES "facts"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "fact_links" ADD CONSTRAINT "FK_bd6f0bafb5084b195aa7533d97d" FOREIGN KEY ("fact_id_b") REFERENCES "facts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "fact_links" DROP CONSTRAINT "FK_bd6f0bafb5084b195aa7533d97d"`);
        await queryRunner.query(`ALTER TABLE "fact_links" DROP CONSTRAINT "FK_40e04149976ac01006c346a1387"`);
        await queryRunner.query(`ALTER TABLE "projects" DROP CONSTRAINT "FK_b1bd2fbf5d0ef67319c91acb5cf"`);
        await queryRunner.query(`ALTER TABLE "project_members" DROP CONSTRAINT "FK_e89aae80e010c2faa72e6a49ce8"`);
        await queryRunner.query(`ALTER TABLE "project_members" DROP CONSTRAINT "FK_b5729113570c20c7e214cf3f58d"`);
        await queryRunner.query(`ALTER TABLE "corpuses" DROP CONSTRAINT "FK_934c586c0be9daf4f626ce0feac"`);
        await queryRunner.query(`ALTER TABLE "corpuses" DROP CONSTRAINT "FK_3b147d85ec03a7007f7092cc879"`);
        await queryRunner.query(`ALTER TABLE "facts" DROP CONSTRAINT "FK_324caa13d2c08921bd1feec1fca"`);
        await queryRunner.query(`ALTER TABLE "facts" DROP CONSTRAINT "FK_b3638a28211b137e5df4f51bb84"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_bd6f0bafb5084b195aa7533d97"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_40e04149976ac01006c346a138"`);
        await queryRunner.query(`DROP TABLE "fact_links"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_97672ac88f789774dd47f7c8be"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_applicationrole_enum"`);
        await queryRunner.query(`DROP TABLE "projects"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b3f491d3a3f986106d281d8eb4"`);
        await queryRunner.query(`DROP TABLE "project_members"`);
        await queryRunner.query(`DROP TYPE "public"."project_members_role_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3b147d85ec03a7007f7092cc87"`);
        await queryRunner.query(`DROP TABLE "corpuses"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b3638a28211b137e5df4f51bb8"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_324caa13d2c08921bd1feec1fc"`);
        await queryRunner.query(`DROP TABLE "facts"`);
        await queryRunner.query(`DROP TYPE "public"."facts_state_enum"`);
    }

}
