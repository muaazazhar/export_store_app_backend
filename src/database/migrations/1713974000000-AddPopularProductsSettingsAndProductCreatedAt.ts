import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPopularProductsSettingsAndProductCreatedAt1713974000000
  implements MigrationInterface
{
  name = 'AddPopularProductsSettingsAndProductCreatedAt1713974000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "payment_settings"
      ADD COLUMN "popularProductLimit" integer NOT NULL DEFAULT 12,
      ADD COLUMN "popularCriteria" character varying(32) NOT NULL DEFAULT 'most_ordered',
      ADD COLUMN "featuredProductIds" jsonb NOT NULL DEFAULT '[]'
    `);

    await queryRunner.query(`
      ALTER TABLE "product"
      ADD COLUMN "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "payment_settings"
      DROP COLUMN "popularProductLimit",
      DROP COLUMN "popularCriteria",
      DROP COLUMN "featuredProductIds"
    `);

    await queryRunner.query(`
      ALTER TABLE "product" DROP COLUMN "createdAt"
    `);
  }
}
