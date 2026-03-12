import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDevotees1710000012000 implements MigrationInterface {
  name = 'CreateDevotees1710000012000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "devotee_gender_enum" AS ENUM ('MALE', 'FEMALE', 'OTHER')
    `);

    await queryRunner.query(`
      CREATE TYPE "devotee_tier_enum" AS ENUM (
        'REGULAR', 'PATRON', 'VIP', 'LIFE_TRUSTEE'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "devotees" (
        "id"                   uuid          NOT NULL DEFAULT gen_random_uuid(),
        "created_at"           TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "updated_at"           TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "deleted_at"           TIMESTAMPTZ,
        "temple_id"            uuid          NOT NULL,
        "name"                 varchar(200)  NOT NULL,
        "phone"                varchar(15)   NOT NULL,
        "email"                varchar,
        "gender"               "devotee_gender_enum",
        "date_of_birth"        date,
        "anniversary_date"     date,
        "pan_number_encrypted" varchar,
        "pan_number_masked"    varchar(12),
        "address_line1"        varchar,
        "city"                 varchar,
        "state"                varchar,
        "pin_code"             varchar(6),
        "gotra"                varchar(100),
        "nakshatra"            varchar(50),
        "rashi"                varchar(50),
        "tier"                 "devotee_tier_enum" NOT NULL DEFAULT 'REGULAR',
        "family_head_id"       uuid,
        "whatsapp_opted_out"   boolean       NOT NULL DEFAULT false,
        "sms_opted_out"        boolean       NOT NULL DEFAULT false,
        "photo_url"            varchar,
        "member_since"         date,
        "notes"                text,
        "referred_by"          uuid,
        CONSTRAINT "PK_devotees" PRIMARY KEY ("id")
      )
    `);

    /* ── Indexes ──────────────────────────────────────────────────────────── */

    /* Primary lookup: find by temple + phone (used by findOrCreate) */
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_devotees_temple_phone"
        ON "devotees" ("temple_id", "phone")
        WHERE "deleted_at" IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_devotees_temple_id" ON "devotees" ("temple_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_devotees_temple_tier" ON "devotees" ("temple_id", "tier")
    `);

    /* ── Self-referential foreign keys ────────────────────────────────────── */

    await queryRunner.query(`
      ALTER TABLE "devotees"
        ADD CONSTRAINT "FK_devotees_family_head_id"
        FOREIGN KEY ("family_head_id") REFERENCES "devotees" ("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "devotees"
        ADD CONSTRAINT "FK_devotees_referred_by"
        FOREIGN KEY ("referred_by") REFERENCES "devotees" ("id") ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "devotees"`);
    await queryRunner.query(`DROP TYPE "devotee_tier_enum"`);
    await queryRunner.query(`DROP TYPE "devotee_gender_enum"`);
  }
}
