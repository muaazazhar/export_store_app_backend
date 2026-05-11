import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCatalogImagesAndStrictCategoryFk1713962000000
  implements MigrationInterface
{
  name = 'AddCatalogImagesAndStrictCategoryFk1713962000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "category" ADD "imageBlob" bytea`);
    await queryRunner.query(`ALTER TABLE "category" ADD "imageMime" character varying`);
    await queryRunner.query(
      `ALTER TABLE "category" ADD "imageFilename" character varying`,
    );

    await queryRunner.query(`ALTER TABLE "product" ADD "imageBlob" bytea`);
    await queryRunner.query(`ALTER TABLE "product" ADD "imageMime" character varying`);
    await queryRunner.query(
      `ALTER TABLE "product" ADD "imageFilename" character varying`,
    );

    await queryRunner.query(`
      INSERT INTO "category" ("name", "imageBlob", "imageMime", "imageFilename")
      SELECT 'Uncategorized', decode('', 'hex'), 'image/png', 'placeholder.png'
      WHERE NOT EXISTS (SELECT 1 FROM "category")
    `);

    await queryRunner.query(`
      UPDATE "product"
      SET "categoryId" = (SELECT "id" FROM "category" ORDER BY "id" ASC LIMIT 1)
      WHERE "categoryId" IS NULL
    `);

    await queryRunner.query(`
      UPDATE "category"
      SET "imageBlob" = decode('', 'hex'),
          "imageMime" = 'image/png',
          "imageFilename" = CONCAT('category_', "id", '.png')
      WHERE "imageBlob" IS NULL OR "imageMime" IS NULL OR "imageFilename" IS NULL
    `);

    await queryRunner.query(`
      UPDATE "product"
      SET "imageBlob" = decode('', 'hex'),
          "imageMime" = 'image/png',
          "imageFilename" = CONCAT('product_', "id", '.png')
      WHERE "imageBlob" IS NULL OR "imageMime" IS NULL OR "imageFilename" IS NULL
    `);

    await queryRunner.query(`ALTER TABLE "category" ALTER COLUMN "imageBlob" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "category" ALTER COLUMN "imageMime" SET NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "category" ALTER COLUMN "imageFilename" SET NOT NULL`,
    );

    await queryRunner.query(`ALTER TABLE "product" ALTER COLUMN "imageBlob" SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE "product" ALTER COLUMN "imageMime" SET NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE "product" ALTER COLUMN "imageFilename" SET NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE "product" ALTER COLUMN "categoryId" SET NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "product" ALTER COLUMN "categoryId" DROP NOT NULL`);
    await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "imageFilename"`);
    await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "imageMime"`);
    await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "imageBlob"`);
    await queryRunner.query(`ALTER TABLE "category" DROP COLUMN "imageFilename"`);
    await queryRunner.query(`ALTER TABLE "category" DROP COLUMN "imageMime"`);
    await queryRunner.query(`ALTER TABLE "category" DROP COLUMN "imageBlob"`);
  }
}
