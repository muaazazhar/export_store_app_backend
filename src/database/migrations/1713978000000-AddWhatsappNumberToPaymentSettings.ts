import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWhatsappNumberToPaymentSettings1713978000000
  implements MigrationInterface
{
  name = 'AddWhatsappNumberToPaymentSettings1713978000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "payment_settings"
      ADD COLUMN "whatsappNumber" character varying
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "payment_settings"
      DROP COLUMN "whatsappNumber"
    `);
  }
}
