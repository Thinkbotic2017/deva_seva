import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDonations1710000008000 implements MigrationInterface {
  name = 'CreateDonations1710000008000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "donation_mode_enum" AS ENUM (
        'CASH', 'UPI', 'CARD', 'CHEQUE', 'NEFT', 'DD', 'ONLINE'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "donation_status_enum" AS ENUM (
        'PENDING', 'CONFIRMED', 'RECEIPT_GENERATED', 'RECEIPT_SENT', 'CANCELLED'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "donations" (
        "id"                    uuid         NOT NULL DEFAULT gen_random_uuid(),
        "created_at"            TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updated_at"            TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "deleted_at"            TIMESTAMPTZ,
        "temple_id"             uuid         NOT NULL,
        "receipt_number"        varchar(50),
        "devotee_id"            uuid,
        "category_id"           uuid         NOT NULL,
        "donor_name"            varchar(200) NOT NULL,
        "donor_phone"           varchar(15),
        "donor_pan_encrypted"   varchar,
        "donor_pan_masked"      varchar(12),
        "amount"                decimal(12,2) NOT NULL,
        "mode"                  "donation_mode_enum" NOT NULL,
        "status"                "donation_status_enum" NOT NULL DEFAULT 'PENDING',
        "is_80g_eligible"       boolean      NOT NULL DEFAULT false,
        "is_anonymous"          boolean      NOT NULL DEFAULT false,
        "razorpay_order_id"     varchar,
        "razorpay_payment_id"   varchar,
        "payment_reference"     varchar,
        "payment_date"          date         NOT NULL,
        "receipt_pdf_s3_key"    varchar,
        "receipt_generated_at"  TIMESTAMPTZ,
        "receipt_sent_at"       TIMESTAMPTZ,
        "fund_id"               uuid,
        "recorded_by"           uuid,
        "fiscal_year"           varchar(10)  NOT NULL,
        "notes"                 text,
        CONSTRAINT "PK_donations" PRIMARY KEY ("id")
      )
    `);

    /* Composite indexes for common list queries */
    await queryRunner.query(`
      CREATE INDEX "IDX_donations_temple_payment_date"
        ON "donations" ("temple_id", "payment_date")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_donations_temple_fiscal_year"
        ON "donations" ("temple_id", "fiscal_year")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_donations_temple_status"
        ON "donations" ("temple_id", "status")
    `);

    /*
     * Partial unique index: a temple's receipt numbers must be unique,
     * but NULL receipt_number is allowed (before receipt is generated).
     */
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_donations_temple_receipt_number"
        ON "donations" ("temple_id", "receipt_number")
        WHERE "receipt_number" IS NOT NULL
    `);

    /* FKs */
    await queryRunner.query(`
      ALTER TABLE "donations"
        ADD CONSTRAINT "FK_donations_category_id"
        FOREIGN KEY ("category_id") REFERENCES "donation_categories" ("id")
    `);

    await queryRunner.query(`
      ALTER TABLE "donations"
        ADD CONSTRAINT "FK_donations_fund_id"
        FOREIGN KEY ("fund_id") REFERENCES "funds" ("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "donations"
        ADD CONSTRAINT "FK_donations_recorded_by"
        FOREIGN KEY ("recorded_by") REFERENCES "users" ("id") ON DELETE SET NULL
    `);

    /*
     * FK to finance_ledger.donation_id is the reverse direction:
     * finance_ledger references donations — added in migration 1710000007000 up() is already done,
     * but the actual FK from finance_ledger.donation_id → donations.id is deferred here.
     */
    await queryRunner.query(`
      ALTER TABLE "finance_ledger"
        ADD CONSTRAINT "FK_finance_ledger_donation_id"
        FOREIGN KEY ("donation_id") REFERENCES "donations" ("id") ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "finance_ledger"
        DROP CONSTRAINT IF EXISTS "FK_finance_ledger_donation_id"
    `);
    await queryRunner.query(`DROP TABLE "donations"`);
    await queryRunner.query(`DROP TYPE "donation_status_enum"`);
    await queryRunner.query(`DROP TYPE "donation_mode_enum"`);
  }
}
