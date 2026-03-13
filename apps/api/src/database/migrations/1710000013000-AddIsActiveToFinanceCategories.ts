import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIsActiveToFinanceCategories1710000013000 implements MigrationInterface {
  name = 'AddIsActiveToFinanceCategories1710000013000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "finance_categories"
        ADD COLUMN "is_active" boolean NOT NULL DEFAULT true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "finance_categories" DROP COLUMN "is_active"
    `);
  }
}
