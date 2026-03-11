import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: CreateUsers
 * Depends on: CreateTemples (references temples.id via temple_id)
 * Creates the users table with role enum and self-referential invited_by FK.
 */
export class CreateUsers1710000001000 implements MigrationInterface {
  name = 'CreateUsers1710000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."users_role_enum" AS ENUM (
        'SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'COUNTER_STAFF',
        'INVENTORY_MANAGER', 'HEAD_PRIEST', 'PRIEST', 'TRUSTEE'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id"                  UUID NOT NULL DEFAULT gen_random_uuid(),
        "created_at"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "deleted_at"          TIMESTAMPTZ,
        "temple_id"           UUID NOT NULL,
        "phone"               VARCHAR(15) NOT NULL,
        "full_name"           VARCHAR(200) NOT NULL,
        "email"               VARCHAR,
        "profile_photo_url"   VARCHAR,
        "role"                "public"."users_role_enum" NOT NULL DEFAULT 'COUNTER_STAFF',
        "is_active"           BOOLEAN NOT NULL DEFAULT TRUE,
        "last_login_at"       TIMESTAMPTZ,
        "invited_by"          UUID,
        "invite_token"        VARCHAR,
        "invite_accepted_at"  TIMESTAMPTZ,
        "preferred_language"  VARCHAR(5) NOT NULL DEFAULT 'hi',
        "permissions"         JSONB NOT NULL DEFAULT '{}',
        CONSTRAINT "PK_users" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_temple_phone" UNIQUE ("temple_id", "phone"),
        CONSTRAINT "FK_users_temple_id"
          FOREIGN KEY ("temple_id") REFERENCES "temples" ("id")
          ON DELETE RESTRICT ON UPDATE CASCADE,
        CONSTRAINT "FK_users_invited_by"
          FOREIGN KEY ("invited_by") REFERENCES "users" ("id")
          ON DELETE SET NULL ON UPDATE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_users_temple_id" ON "users" ("temple_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_users_phone" ON "users" ("phone")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_users_temple_role" ON "users" ("temple_id", "role")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
  }
}
