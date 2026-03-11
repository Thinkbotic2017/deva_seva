import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: CreateSessions
 * Depends on: CreateUsers (references users.id)
 * Stores refresh token slots. One user may have many active sessions.
 *
 * temple_id is denormalised here (copied from users.temple_id on creation)
 * to avoid a join on every token refresh call.
 */
export class CreateSessions1710000003000 implements MigrationInterface {
  name = 'CreateSessions1710000003000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "sessions" (
        "id"                  UUID NOT NULL DEFAULT gen_random_uuid(),
        "user_id"             UUID NOT NULL,
        "temple_id"           UUID NOT NULL,
        "refresh_token_hash"  VARCHAR NOT NULL,
        "device_info"         VARCHAR,
        "ip_address"          VARCHAR,
        "expires_at"          TIMESTAMPTZ NOT NULL,
        "is_revoked"          BOOLEAN NOT NULL DEFAULT FALSE,
        "last_used_at"        TIMESTAMPTZ,
        "created_at"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_sessions" PRIMARY KEY ("id"),
        CONSTRAINT "FK_sessions_user_id"
          FOREIGN KEY ("user_id") REFERENCES "users" ("id")
          ON DELETE CASCADE ON UPDATE CASCADE
      )
    `);

    /* Primary lookup: find active sessions for a user on token refresh / logout-all */
    await queryRunner.query(`
      CREATE INDEX "IDX_sessions_user_id_revoked"
        ON "sessions" ("user_id", "is_revoked")
    `);

    /* Used to clean up all sessions for a temple on deactivation */
    await queryRunner.query(`
      CREATE INDEX "IDX_sessions_temple_id" ON "sessions" ("temple_id")
    `);

    /* Expiry-based cleanup by the nightly reconciliation cron */
    await queryRunner.query(`
      CREATE INDEX "IDX_sessions_expires_at" ON "sessions" ("expires_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "sessions"`);
  }
}
