import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPaymentMethodToOrder1713963000000 implements MigrationInterface {
  name = 'AddPaymentMethodToOrder1713963000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "order" ADD "paymentMethod" character varying`);
    await queryRunner.query(`
      UPDATE "order"
      SET "paymentMethod" = 'cash_on_delivery'
      WHERE "paymentMethod" IS NULL OR "paymentMethod" = ''
    `);
    await queryRunner.query(
      `ALTER TABLE "order" ALTER COLUMN "paymentMethod" SET NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "order" DROP COLUMN "paymentMethod"`);
  }
}
