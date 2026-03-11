import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFinanceCategories1710000006000 implements MigrationInterface {
  name = 'CreateFinanceCategories1710000006000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "finance_category_type_enum" AS ENUM ('INCOME', 'EXPENSE')
    `);

    await queryRunner.query(`
      CREATE TABLE "finance_categories" (
        "id"         uuid        NOT NULL DEFAULT gen_random_uuid(),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deleted_at" TIMESTAMPTZ,
        "temple_id"  uuid        NOT NULL,
        "name"       varchar(200) NOT NULL,
        "type"       "finance_category_type_enum" NOT NULL,
        "is_system"  boolean     NOT NULL DEFAULT false,
        "sort_order" integer     NOT NULL DEFAULT 0,
        CONSTRAINT "PK_finance_categories" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_finance_categories_temple_id"
        ON "finance_categories" ("temple_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "finance_categories"`);
    await queryRunner.query(`DROP TYPE "finance_category_type_enum"`);
  }
}
