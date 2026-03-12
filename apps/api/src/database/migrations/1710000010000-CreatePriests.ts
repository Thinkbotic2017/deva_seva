import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePriests1710000010000 implements MigrationInterface {
  name = 'CreatePriests1710000010000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "priests" (
        "id"                     uuid         NOT NULL DEFAULT gen_random_uuid(),
        "created_at"             TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "updated_at"             TIMESTAMPTZ  NOT NULL DEFAULT now(),
        "deleted_at"             TIMESTAMPTZ,
        "temple_id"              uuid         NOT NULL,
        "user_id"                uuid,
        "name"                   varchar(200) NOT NULL,
        "phone"                  varchar(15),
        "specialization"         varchar,
        "assigned_seva_type_ids" jsonb        NOT NULL DEFAULT '[]',
        "is_active"              boolean      NOT NULL DEFAULT true,
        "profile_photo_url"      varchar,
        CONSTRAINT "PK_priests" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_priests_temple_id" ON "priests" ("temple_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "priests"
        ADD CONSTRAINT "FK_priests_user_id"
        FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "priests"`);
  }
}
