import { MigrationInterface, QueryRunner } from 'typeorm';

export class StorePaymentScreenshotInDb1713973000000
  implements MigrationInterface
{
  name = 'StorePaymentScreenshotInDb1713973000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "order"
      ADD COLUMN "paymentScreenshotBlob" bytea,
      ADD COLUMN "paymentScreenshotMime" character varying,
      ADD COLUMN "paymentScreenshotFilename" character varying
    `);

    await queryRunner.query(`
      ALTER TABLE "order" DROP COLUMN "payment_screenshot_url"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "order"
      ADD COLUMN "payment_screenshot_url" character varying(512)
    `);

    await queryRunner.query(`
      ALTER TABLE "order"
      DROP COLUMN "paymentScreenshotBlob",
      DROP COLUMN "paymentScreenshotMime",
      DROP COLUMN "paymentScreenshotFilename"
    `);
  }
}
