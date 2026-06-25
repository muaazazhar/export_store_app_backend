import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderTypeToOrder1713976000000 implements MigrationInterface {
  name = 'AddOrderTypeToOrder1713976000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "order"
      ADD COLUMN "orderType" character varying NOT NULL DEFAULT 'catalog'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "order" DROP COLUMN "orderType"
    `);
  }
}
