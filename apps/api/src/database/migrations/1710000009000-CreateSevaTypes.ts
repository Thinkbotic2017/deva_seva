import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSevaTypes1710000009000 implements MigrationInterface {
  name = 'CreateSevaTypes1710000009000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "seva_frequency_enum" AS ENUM (
        'DAILY', 'WEEKLY', 'MONTHLY', 'FESTIVAL', 'ON_DEMAND'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "seva_types" (
        "id"                    uuid         NOT NULL DEFAULT gen_random_uuid(),
        "created_at"            TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updated_at"            TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "deleted_at"            TIMESTAMPTZ,
        "temple_id"             uuid         NOT NULL,
        "name"                  varchar(200) NOT NULL,
        "name_hi"               varchar(200),
        "name_local"            varchar(200),
        "description"           text,
        "duration_minutes"      integer      NOT NULL DEFAULT 60,
        "frequency"             "seva_frequency_enum" NOT NULL,
        "pricing_tiers"         jsonb        NOT NULL DEFAULT '[]',
        "max_bookings_per_slot" integer      NOT NULL DEFAULT 1,
        "advance_booking_days"  integer      NOT NULL DEFAULT 30,
        "requires_sankalpa"     boolean      NOT NULL DEFAULT false,
        "image_url"             varchar,
        "is_active"             boolean      NOT NULL DEFAULT true,
        "is_online_bookable"    boolean      NOT NULL DEFAULT false,
        "available_days"        jsonb        NOT NULL DEFAULT '[0,1,2,3,4,5,6]',
        "available_time_slots"  jsonb        NOT NULL DEFAULT '[]',
        "sort_order"            integer      NOT NULL DEFAULT 0,
        CONSTRAINT "PK_seva_types" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_seva_types_temple_id" ON "seva_types" ("temple_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "seva_types"`);
    await queryRunner.query(`DROP TYPE "seva_frequency_enum"`);
  }
}
