import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDiscountToProduct1713964000000 implements MigrationInterface {
  name = 'AddDiscountToProduct1713964000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "product"
      ADD "discount" numeric(5,2) NOT NULL DEFAULT '0'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "product" DROP COLUMN "discount"
    `);
  }
}
