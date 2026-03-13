import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Database integrity fixes:
 *  1. pg_trgm extension for efficient ILIKE search on name/phone/donor_name
 *  2. CHECK constraints — amount > 0 on financial tables
 *  3. Trigram indexes on high-cardinality text columns
 *  4. Partial unique index on devotees (temple_id, phone) WHERE deleted_at IS NULL
 *  5. Composite index on seva_bookings for availability queries
 */
export class DbIntegrityFixes1710000014000 implements MigrationInterface {
  name = 'DbIntegrityFixes1710000014000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. pg_trgm extension ──────────────────────────────────────────────────
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);

    // ── 2. CHECK constraints ──────────────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE donations
        ADD CONSTRAINT chk_donations_amount_positive CHECK (amount > 0)
    `);

    await queryRunner.query(`
      ALTER TABLE finance_ledger
        ADD CONSTRAINT chk_finance_ledger_amount_positive CHECK (amount > 0)
    `);

    await queryRunner.query(`
      ALTER TABLE seva_bookings
        ADD CONSTRAINT chk_seva_bookings_amount_positive CHECK (amount > 0)
    `);

    // ── 3. Trigram indexes ────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE INDEX idx_devotees_name_trgm
        ON devotees USING gin (name gin_trgm_ops)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_devotees_phone_trgm
        ON devotees USING gin (phone gin_trgm_ops)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_donations_donor_name_trgm
        ON donations USING gin (donor_name gin_trgm_ops)
    `);

    // ── 4. Partial unique index on devotees (temple_id, phone) ───────────────
    // Non-deleted devotees must have unique phone per temple.
    // Soft-deleted rows are excluded so the same phone can be re-registered.
    await queryRunner.query(`
      CREATE UNIQUE INDEX idx_devotees_temple_phone_active
        ON devotees (temple_id, phone)
        WHERE deleted_at IS NULL
    `);

    // ── 5. Composite index for seva availability queries ─────────────────────
    await queryRunner.query(`
      CREATE INDEX idx_seva_bookings_availability
        ON seva_bookings (temple_id, seva_date, time_slot, seva_type_id, status)
        WHERE deleted_at IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ── Reverse in reverse order ──────────────────────────────────────────────
    await queryRunner.query(`DROP INDEX IF EXISTS idx_seva_bookings_availability`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_devotees_temple_phone_active`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_donations_donor_name_trgm`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_devotees_phone_trgm`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_devotees_name_trgm`);

    await queryRunner.query(`
      ALTER TABLE seva_bookings
        DROP CONSTRAINT IF EXISTS chk_seva_bookings_amount_positive
    `);

    await queryRunner.query(`
      ALTER TABLE finance_ledger
        DROP CONSTRAINT IF EXISTS chk_finance_ledger_amount_positive
    `);

    await queryRunner.query(`
      ALTER TABLE donations
        DROP CONSTRAINT IF EXISTS chk_donations_amount_positive
    `);

    // Note: pg_trgm extension is not dropped — it may be used by other indexes/queries.
  }
}
