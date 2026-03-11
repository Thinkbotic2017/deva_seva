import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFunds1710000005000 implements MigrationInterface {
  name = 'CreateFunds1710000005000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "funds" (
        "id"            uuid         NOT NULL DEFAULT gen_random_uuid(),
        "created_at"    TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updated_at"    TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "deleted_at"    TIMESTAMPTZ,
        "temple_id"     uuid         NOT NULL,
        "name"          varchar(200) NOT NULL,
        "description"   text,
        "is_active"     boolean      NOT NULL DEFAULT true,
        "target_amount" decimal(14,2),
        "color"         varchar(7)   NOT NULL DEFAULT '#1455A0',
        "sort_order"    integer      NOT NULL DEFAULT 0,
        CONSTRAINT "PK_funds" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_funds_temple_id" ON "funds" ("temple_id")
    `);

    /* Now that funds exists, add the deferred FK from donation_categories */
    await queryRunner.query(`
      ALTER TABLE "donation_categories"
        ADD CONSTRAINT "FK_donation_categories_fund_id"
        FOREIGN KEY ("fund_id") REFERENCES "funds" ("id") ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "donation_categories"
        DROP CONSTRAINT IF EXISTS "FK_donation_categories_fund_id"
    `);
    await queryRunner.query(`DROP TABLE "funds"`);
  }
}
