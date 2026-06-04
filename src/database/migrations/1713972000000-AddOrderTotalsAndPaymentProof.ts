import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderTotalsAndPaymentProof1713972000000
  implements MigrationInterface
{
  name = 'AddOrderTotalsAndPaymentProof1713972000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "order"
      ADD COLUMN "subtotalAmount" numeric(12,2) NOT NULL DEFAULT '0',
      ADD COLUMN "deliveryCharge" numeric(12,2) NOT NULL DEFAULT '0',
      ADD COLUMN "paymentReference" character varying(100),
      ADD COLUMN "payment_screenshot_url" character varying(512),
      ADD COLUMN "walletProvider" character varying(32)
    `);

    await queryRunner.query(`
      UPDATE "order"
      SET "subtotalAmount" = "totalAmount",
          "deliveryCharge" = '0'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "order"
      DROP COLUMN "subtotalAmount",
      DROP COLUMN "deliveryCharge",
      DROP COLUMN "paymentReference",
      DROP COLUMN "payment_screenshot_url",
      DROP COLUMN "walletProvider"
    `);
  }
}
