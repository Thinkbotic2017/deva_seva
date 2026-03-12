import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSevaBookings1710000011000 implements MigrationInterface {
  name = 'CreateSevaBookings1710000011000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "seva_booking_payment_mode_enum" AS ENUM (
        'CASH', 'UPI', 'CARD', 'ONLINE'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "seva_booking_status_enum" AS ENUM (
        'PENDING_PAYMENT', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "seva_bookings" (
        "id"                   uuid          NOT NULL DEFAULT gen_random_uuid(),
        "created_at"           TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "updated_at"           TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "deleted_at"           TIMESTAMPTZ,
        "temple_id"            uuid          NOT NULL,
        "booking_number"       varchar(50),
        "seva_type_id"         uuid          NOT NULL,
        "devotee_id"           uuid,
        "devotee_name"         varchar(200)  NOT NULL,
        "devotee_phone"        varchar(15),
        "seva_date"            date          NOT NULL,
        "time_slot"            varchar(10)   NOT NULL,
        "tier_name"            varchar(100),
        "amount"               decimal(10,2) NOT NULL,
        "payment_mode"         "seva_booking_payment_mode_enum",
        "status"               "seva_booking_status_enum" NOT NULL DEFAULT 'PENDING_PAYMENT',
        "sankalpa_name"        varchar(200),
        "gotra"                varchar(100),
        "nakshatra"            varchar(50),
        "sankalpa_purpose"     text,
        "additional_names"     jsonb         NOT NULL DEFAULT '[]',
        "priest_id"            uuid,
        "razorpay_order_id"    varchar,
        "razorpay_payment_id"  varchar,
        "confirmation_sent_at" TIMESTAMPTZ,
        "reminder_sent_at"     TIMESTAMPTZ,
        "completed_at"         TIMESTAMPTZ,
        "cancelled_at"         TIMESTAMPTZ,
        "cancellation_reason"  varchar,
        "refund_amount"        decimal(10,2),
        "recorded_by"          uuid,
        "fiscal_year"          varchar(10)   NOT NULL,
        CONSTRAINT "PK_seva_bookings" PRIMARY KEY ("id")
      )
    `);

    /* ── Indexes ─────────────────────────────────────────────────────────── */

    await queryRunner.query(`
      CREATE INDEX "IDX_seva_bookings_temple_seva_date"
        ON "seva_bookings" ("temple_id", "seva_date")
    `);

    /* Composite index for availability queries:
       SELECT COUNT(*) WHERE temple_id=? AND seva_date=? AND time_slot=? AND seva_type_id=? */
    await queryRunner.query(`
      CREATE INDEX "IDX_seva_bookings_availability"
        ON "seva_bookings" ("temple_id", "seva_date", "time_slot", "seva_type_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_seva_bookings_temple_status"
        ON "seva_bookings" ("temple_id", "status")
    `);

    /* Partial unique index — booking_number must be unique per temple,
       but NULL is allowed (before number is assigned). */
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_seva_bookings_temple_booking_number"
        ON "seva_bookings" ("temple_id", "booking_number")
        WHERE "booking_number" IS NOT NULL
    `);

    /* ── Foreign keys ────────────────────────────────────────────────────── */

    await queryRunner.query(`
      ALTER TABLE "seva_bookings"
        ADD CONSTRAINT "FK_seva_bookings_seva_type_id"
        FOREIGN KEY ("seva_type_id") REFERENCES "seva_types" ("id")
    `);

    await queryRunner.query(`
      ALTER TABLE "seva_bookings"
        ADD CONSTRAINT "FK_seva_bookings_priest_id"
        FOREIGN KEY ("priest_id") REFERENCES "priests" ("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "seva_bookings"
        ADD CONSTRAINT "FK_seva_bookings_recorded_by"
        FOREIGN KEY ("recorded_by") REFERENCES "users" ("id") ON DELETE SET NULL
    `);

    /* finance_ledger.seva_booking_id FK — deferred here now that seva_bookings exists */
    await queryRunner.query(`
      ALTER TABLE "finance_ledger"
        ADD CONSTRAINT "FK_finance_ledger_seva_booking_id"
        FOREIGN KEY ("seva_booking_id") REFERENCES "seva_bookings" ("id") ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "finance_ledger"
        DROP CONSTRAINT IF EXISTS "FK_finance_ledger_seva_booking_id"
    `);
    await queryRunner.query(`DROP TABLE "seva_bookings"`);
    await queryRunner.query(`DROP TYPE "seva_booking_status_enum"`);
    await queryRunner.query(`DROP TYPE "seva_booking_payment_mode_enum"`);
  }
}
