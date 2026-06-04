import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePaymentSettings1713967000000 implements MigrationInterface {
  name = 'CreatePaymentSettings1713967000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "payment_settings" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "cashOnDeliveryEnabled" boolean NOT NULL DEFAULT true,
        "cardEnabled" boolean NOT NULL DEFAULT true,
        "bankTransferEnabled" boolean NOT NULL DEFAULT true,
        "bankDetails" jsonb,
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_payment_settings_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      INSERT INTO "payment_settings" (
        "cashOnDeliveryEnabled",
        "cardEnabled",
        "bankTransferEnabled",
        "bankDetails"
      ) VALUES (true, true, true, NULL)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "payment_settings"`);
  }
}
