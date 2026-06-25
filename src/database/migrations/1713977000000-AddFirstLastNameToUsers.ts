import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFirstLastNameToUsers1713977000000
  implements MigrationInterface
{
  name = 'AddFirstLastNameToUsers1713977000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "first_name" character varying(50) NOT NULL DEFAULT '',
      ADD COLUMN "last_name" character varying(50) NOT NULL DEFAULT ''
    `);

    await queryRunner.query(`
      UPDATE "users"
      SET "first_name" = LEFT("username", 50)
      WHERE "first_name" = ''
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      ALTER COLUMN "first_name" DROP DEFAULT,
      ALTER COLUMN "last_name" DROP DEFAULT
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN "first_name",
      DROP COLUMN "last_name"
    `);
  }
}
