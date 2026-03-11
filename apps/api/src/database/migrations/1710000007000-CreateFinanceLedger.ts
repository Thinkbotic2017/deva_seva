import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFinanceLedger1710000007000 implements MigrationInterface {
  name = 'CreateFinanceLedger1710000007000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "ledger_type_enum" AS ENUM ('INCOME', 'EXPENSE')
    `);

    await queryRunner.query(`
      CREATE TYPE "expense_status_enum" AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'REJECTED')
    `);

    await queryRunner.query(`
      CREATE TABLE "finance_ledger" (
        "id"                        uuid         NOT NULL DEFAULT gen_random_uuid(),
        "created_at"                TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updated_at"                TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "deleted_at"                TIMESTAMPTZ,
        "temple_id"                 uuid         NOT NULL,
        "type"                      "ledger_type_enum" NOT NULL,
        "amount"                    decimal(14,2) NOT NULL,
        "entry_date"                date         NOT NULL,
        "description"               varchar(500) NOT NULL,
        "category_id"               uuid,
        "fund_id"                   uuid,
        "donation_id"               uuid,
        "seva_booking_id"           uuid,
        "inventory_transaction_id"  uuid,
        "expense_status"            "expense_status_enum",
        "approved_by"               uuid,
        "approved_at"               TIMESTAMPTZ,
        "vendor_id"                 uuid,
        "payment_mode"              varchar,
        "reference_number"          varchar,
        "is_auto_posted"            boolean      NOT NULL DEFAULT false,
        "recorded_by"               uuid,
        "fiscal_year"               varchar(10)  NOT NULL,
        CONSTRAINT "PK_finance_ledger" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_finance_ledger_temple_entry_date"
        ON "finance_ledger" ("temple_id", "entry_date")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_finance_ledger_temple_fund_id"
        ON "finance_ledger" ("temple_id", "fund_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_finance_ledger_temple_fiscal_year_type"
        ON "finance_ledger" ("temple_id", "fiscal_year", "type")
    `);

    /* FK references — FKs to later-created tables (seva_bookings, inventory_transactions, vendors)
       will be added in their respective migrations. */
    await queryRunner.query(`
      ALTER TABLE "finance_ledger"
        ADD CONSTRAINT "FK_finance_ledger_category_id"
        FOREIGN KEY ("category_id") REFERENCES "finance_categories" ("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "finance_ledger"
        ADD CONSTRAINT "FK_finance_ledger_fund_id"
        FOREIGN KEY ("fund_id") REFERENCES "funds" ("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "finance_ledger"
        ADD CONSTRAINT "FK_finance_ledger_approved_by"
        FOREIGN KEY ("approved_by") REFERENCES "users" ("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "finance_ledger"
        ADD CONSTRAINT "FK_finance_ledger_recorded_by"
        FOREIGN KEY ("recorded_by") REFERENCES "users" ("id") ON DELETE SET NULL
    `);

    /*
     * Append-only enforcement via DB trigger.
     * Blocks UPDATE on financial fields; only expense_status, approved_by, approved_at are mutable.
     */
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION prevent_finance_ledger_financial_update()
      RETURNS TRIGGER AS $$
      BEGIN
        IF OLD.amount IS DISTINCT FROM NEW.amount
          OR OLD.type IS DISTINCT FROM NEW.type
          OR OLD.entry_date IS DISTINCT FROM NEW.entry_date
          OR OLD.description IS DISTINCT FROM NEW.description
          OR OLD.fund_id IS DISTINCT FROM NEW.fund_id
          OR OLD.donation_id IS DISTINCT FROM NEW.donation_id
          OR OLD.seva_booking_id IS DISTINCT FROM NEW.seva_booking_id
          OR OLD.inventory_transaction_id IS DISTINCT FROM NEW.inventory_transaction_id
          OR OLD.is_auto_posted IS DISTINCT FROM NEW.is_auto_posted
          OR OLD.recorded_by IS DISTINCT FROM NEW.recorded_by
          OR OLD.fiscal_year IS DISTINCT FROM NEW.fiscal_year
        THEN
          RAISE EXCEPTION 'finance_ledger: financial fields are immutable after insert';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      CREATE TRIGGER trg_finance_ledger_immutable
      BEFORE UPDATE ON "finance_ledger"
      FOR EACH ROW EXECUTE FUNCTION prevent_finance_ledger_financial_update();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER IF EXISTS trg_finance_ledger_immutable ON "finance_ledger"`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS prevent_finance_ledger_financial_update()`);
    await queryRunner.query(`DROP TABLE "finance_ledger"`);
    await queryRunner.query(`DROP TYPE "expense_status_enum"`);
    await queryRunner.query(`DROP TYPE "ledger_type_enum"`);
  }
}
