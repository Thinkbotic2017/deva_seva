import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDonationCategories1710000004000 implements MigrationInterface {
  name = 'CreateDonationCategories1710000004000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "donation_categories" (
        "id"              uuid        NOT NULL DEFAULT gen_random_uuid(),
        "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at"      TIMESTAMPTZ,
        "temple_id"       uuid        NOT NULL,
        "name"            varchar(200) NOT NULL,
        "description"     text,
        "is_80g_eligible" boolean     NOT NULL DEFAULT false,
        "is_active"       boolean     NOT NULL DEFAULT true,
        "sort_order"      integer     NOT NULL DEFAULT 0,
        "color"           varchar(7)  NOT NULL DEFAULT '#E8530A',
        "fund_id"         uuid,
        CONSTRAINT "PK_donation_categories" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_donation_categories_temple_id"
        ON "donation_categories" ("temple_id")
    `);

    /* fund_id FK is added after the funds table is created in migration 1710000005000 */
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "donation_categories"`);
  }
}
