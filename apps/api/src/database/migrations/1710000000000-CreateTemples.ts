import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: CreateTemples
 * Creates the temples table — root of every tenant.
 * Must run before users, donations, and all other tenant-scoped tables.
 */
export class CreateTemples1710000000000 implements MigrationInterface {
  name = 'CreateTemples1710000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."temples_category_enum" AS ENUM (
        'HINDU', 'JAIN', 'SIKH', 'BUDDHIST', 'CHRISTIAN', 'OTHER'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."temples_plan_enum" AS ENUM (
        'STARTER', 'GROWTH', 'ENTERPRISE'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "temples" (
        "id"                        UUID NOT NULL DEFAULT gen_random_uuid(),
        "created_at"                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at"                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "deleted_at"                TIMESTAMPTZ,
        "name"                      VARCHAR(200) NOT NULL,
        "slug"                      VARCHAR(100) NOT NULL,
        "category"                  "public"."temples_category_enum",
        "description"               TEXT,
        "logo_url"                  VARCHAR,
        "banner_url"                VARCHAR,
        "address_line1"             VARCHAR,
        "address_line2"             VARCHAR,
        "city"                      VARCHAR,
        "state"                     VARCHAR,
        "pin_code"                  VARCHAR(6),
        "phone_primary"             VARCHAR(15),
        "phone_whatsapp"            VARCHAR(15),
        "email"                     VARCHAR,
        "website_url"               VARCHAR,
        "pan_number"                VARCHAR,
        "trust_reg_number"          VARCHAR,
        "number_80g"                VARCHAR,
        "number_80g_expiry"         DATE,
        "is_80g_registered"         BOOLEAN NOT NULL DEFAULT FALSE,
        "fcra_number"               VARCHAR,
        "receipt_prefix"            VARCHAR(20) NOT NULL DEFAULT 'RCPT',
        "upi_id"                    VARCHAR,
        "razorpay_key_id"           VARCHAR,
        "razorpay_key_secret"       VARCHAR,
        "plan"                      "public"."temples_plan_enum" NOT NULL DEFAULT 'STARTER',
        "plan_valid_until"          TIMESTAMPTZ,
        "is_active"                 BOOLEAN NOT NULL DEFAULT TRUE,
        "onboarding_completed_at"   TIMESTAMPTZ,
        "settings"                  JSONB NOT NULL DEFAULT '{}',
        "timezone"                  VARCHAR NOT NULL DEFAULT 'Asia/Kolkata',
        "primary_language"          VARCHAR(5) NOT NULL DEFAULT 'hi',
        CONSTRAINT "PK_temples" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_temples_slug" UNIQUE ("slug")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_temples_slug" ON "temples" ("slug")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_temples_is_active" ON "temples" ("is_active")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "temples"`);
    await queryRunner.query(`DROP TYPE "public"."temples_plan_enum"`);
    await queryRunner.query(`DROP TYPE "public"."temples_category_enum"`);
  }
}
