import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: CreateOtpSessions
 * No FK to temples — OTP sessions exist before authentication.
 * Phone-indexed for fast rate-limit and session lookup queries.
 *
 * DB-level: no updated_at (the only mutations are incrementing attempts
 * and flipping is_used — both lightweight enough for UPDATE; no need
 * to track when they happened at the column level).
 */
export class CreateOtpSessions1710000002000 implements MigrationInterface {
  name = 'CreateOtpSessions1710000002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."otp_sessions_purpose_enum" AS ENUM (
        'LOGIN', 'INVITE_ACCEPT'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "otp_sessions" (
        "id"          UUID NOT NULL DEFAULT gen_random_uuid(),
        "phone"       VARCHAR(15) NOT NULL,
        "otp_hash"    VARCHAR NOT NULL,
        "purpose"     "public"."otp_sessions_purpose_enum" NOT NULL DEFAULT 'LOGIN',
        "expires_at"  TIMESTAMPTZ NOT NULL,
        "attempts"    INTEGER NOT NULL DEFAULT 0,
        "is_used"     BOOLEAN NOT NULL DEFAULT FALSE,
        "ip_address"  VARCHAR,
        "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_otp_sessions" PRIMARY KEY ("id")
      )
    `);

    /* Composite index used by every OTP lookup:
       find valid (unused, unexpired) sessions for a phone number */
    await queryRunner.query(`
      CREATE INDEX "IDX_otp_sessions_phone_used_expiry"
        ON "otp_sessions" ("phone", "is_used", "expires_at")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_otp_sessions_phone" ON "otp_sessions" ("phone")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "otp_sessions"`);
    await queryRunner.query(`DROP TYPE "public"."otp_sessions_purpose_enum"`);
  }
}
