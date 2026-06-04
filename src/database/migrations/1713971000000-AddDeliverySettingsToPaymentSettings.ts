import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDeliverySettingsToPaymentSettings1713971000000
  implements MigrationInterface
{
  name = 'AddDeliverySettingsToPaymentSettings1713971000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "payment_settings"
      ADD COLUMN "freeDeliveryEnabled" boolean NOT NULL DEFAULT false,
      ADD COLUMN "deliveryCharge" numeric(12,2) NOT NULL DEFAULT '0'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "payment_settings"
      DROP COLUMN "freeDeliveryEnabled",
      DROP COLUMN "deliveryCharge"
    `);
  }
}
