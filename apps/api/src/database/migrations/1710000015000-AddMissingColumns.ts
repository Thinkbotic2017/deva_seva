import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: AddMissingColumns
 *
 * Adds every column / table that exists in entity definitions but was absent
 * from all prior migrations. Safe to re-run — uses ADD COLUMN IF NOT EXISTS
 * and CREATE TABLE IF NOT EXISTS throughout.
 *
 * Gap analysis (entities vs migrations 000–014):
 *
 *  1. membership_plans  — entity exists, zero prior migration for this table.
 *
 *  2. temples — seven billing/subscription columns added to the entity after
 *     CreateTemples (1710000000000) was written:
 *       plan_id, plan_billing_cycle, plan_amount, plan_razorpay_payment_id,
 *       plan_auto_renew, last_payment_at, suspension_reason
 *
 *  3. finance_categories — color column present in entity, absent from
 *     CreateFinanceCategories (1710000006000) and AddIsActive (1710000013000).
 */
export class AddMissingColumns1710000015000 implements MigrationInterface {
  name = 'AddMissingColumns1710000015000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. membership_plans ───────────────────────────────────────────────────
    // Platform-wide (not tenant-scoped). Managed by SUPER_ADMIN only.
    // Temples reference this table via temples.plan_id (nullable uuid column).
    // Must be created before the plan_id column is added to temples.
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "membership_plans" (
        "id"            UUID          NOT NULL DEFAULT gen_random_uuid(),
        "name"          VARCHAR(100)  NOT NULL,
        "billing_cycle" VARCHAR(20)   NOT NULL,
        "price"         DECIMAL(10,2) NOT NULL,
        "description"   TEXT,
        "features"      JSONB         NOT NULL DEFAULT '[]',
        "is_active"     BOOLEAN       NOT NULL DEFAULT true,
        "sort_order"    INTEGER       NOT NULL DEFAULT 0,
        "created_at"    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        "updated_at"    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_membership_plans" PRIMARY KEY ("id")
      )
    `);

    // ── 2. temples — billing / subscription columns ───────────────────────────
    // plan_id is intentionally a plain uuid column (no FK constraint) matching
    // the entity definition which has @Column but no @ManyToOne decorator.
    await queryRunner.query(`
      ALTER TABLE "temples"
        ADD COLUMN IF NOT EXISTS "plan_id"                  UUID,
        ADD COLUMN IF NOT EXISTS "plan_billing_cycle"       VARCHAR,
        ADD COLUMN IF NOT EXISTS "plan_amount"              DECIMAL(10,2),
        ADD COLUMN IF NOT EXISTS "plan_razorpay_payment_id" VARCHAR,
        ADD COLUMN IF NOT EXISTS "plan_auto_renew"          BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS "last_payment_at"          TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS "suspension_reason"        VARCHAR
    `);

    // ── 3. finance_categories — color ─────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "finance_categories"
        ADD COLUMN IF NOT EXISTS "color" VARCHAR(7) NOT NULL DEFAULT '#6366F1'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ── Reverse 3 ─────────────────────────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "finance_categories"
        DROP COLUMN IF EXISTS "color"
    `);

    // ── Reverse 2 ─────────────────────────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "temples"
        DROP COLUMN IF EXISTS "suspension_reason",
        DROP COLUMN IF EXISTS "last_payment_at",
        DROP COLUMN IF EXISTS "plan_auto_renew",
        DROP COLUMN IF EXISTS "plan_razorpay_payment_id",
        DROP COLUMN IF EXISTS "plan_amount",
        DROP COLUMN IF EXISTS "plan_billing_cycle",
        DROP COLUMN IF EXISTS "plan_id"
    `);

    // ── Reverse 1 ─────────────────────────────────────────────────────────────
    await queryRunner.query(`DROP TABLE IF EXISTS "membership_plans"`);
  }
}
