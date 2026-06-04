import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlignPaymentSettingsWithFrontend1713970000000
  implements MigrationInterface
{
  name = 'AlignPaymentSettingsWithFrontend1713970000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "payment_settings"
      ADD COLUMN "bankName" character varying NOT NULL DEFAULT '',
      ADD COLUMN "accountTitle" character varying NOT NULL DEFAULT '',
      ADD COLUMN "accountNumber" character varying NOT NULL DEFAULT '',
      ADD COLUMN "iban" character varying,
      ADD COLUMN "instructions" character varying,
      ADD COLUMN "easypaisaNumber" character varying,
      ADD COLUMN "jazzcashNumber" character varying
    `);

    await queryRunner.query(`
      UPDATE "payment_settings"
      SET
        "bankName" = COALESCE("bankDetails"->>'bankName', ''),
        "accountTitle" = COALESCE("bankDetails"->>'accountTitle', ''),
        "accountNumber" = COALESCE("bankDetails"->>'accountNumber', ''),
        "iban" = NULLIF(TRIM("bankDetails"->>'iban'), ''),
        "instructions" = NULLIF(TRIM("bankDetails"->>'instructions'), '')
      WHERE "bankDetails" IS NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "payment_settings"
      DROP COLUMN "cashOnDeliveryEnabled",
      DROP COLUMN "cardEnabled",
      DROP COLUMN "bankTransferEnabled",
      DROP COLUMN "bankDetails"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "payment_settings"
      ADD COLUMN "cashOnDeliveryEnabled" boolean NOT NULL DEFAULT true,
      ADD COLUMN "cardEnabled" boolean NOT NULL DEFAULT true,
      ADD COLUMN "bankTransferEnabled" boolean NOT NULL DEFAULT true,
      ADD COLUMN "bankDetails" jsonb
    `);

    await queryRunner.query(`
      UPDATE "payment_settings"
      SET "bankDetails" = jsonb_build_object(
        'bankName', "bankName",
        'accountTitle', "accountTitle",
        'accountNumber', "accountNumber",
        'iban', "iban",
        'instructions', "instructions"
      )
      WHERE "bankName" <> '' OR "accountTitle" <> '' OR "accountNumber" <> ''
    `);

    await queryRunner.query(`
      ALTER TABLE "payment_settings"
      DROP COLUMN "bankName",
      DROP COLUMN "accountTitle",
      DROP COLUMN "accountNumber",
      DROP COLUMN "iban",
      DROP COLUMN "instructions",
      DROP COLUMN "easypaisaNumber",
      DROP COLUMN "jazzcashNumber"
    `);
  }
}
