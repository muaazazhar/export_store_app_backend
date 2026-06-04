import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderNoToOrder1713968000000 implements MigrationInterface {
  name = 'AddOrderNoToOrder1713968000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "order" ADD "orderNo" integer`);

    await queryRunner.query(`
      UPDATE "order" o
      SET "orderNo" = 100000 + sub.rn
      FROM (
        SELECT id, ROW_NUMBER() OVER (ORDER BY id) AS rn
        FROM "order"
      ) sub
      WHERE o.id = sub.id
    `);

    await queryRunner.query(`
      CREATE SEQUENCE "order_order_no_seq" AS integer
    `);

    const maxResult = await queryRunner.query(`
      SELECT COALESCE(MAX("orderNo"), 100000) AS max_no FROM "order"
    `);
    const maxNo = Number(maxResult[0]?.max_no ?? 100000);
    const nextVal = maxNo + 1;

    await queryRunner.query(`
      SELECT setval('order_order_no_seq', ${nextVal}, false)
    `);

    await queryRunner.query(`
      ALTER TABLE "order"
      ALTER COLUMN "orderNo" SET DEFAULT nextval('order_order_no_seq')
    `);

    await queryRunner.query(`
      ALTER TABLE "order" ALTER COLUMN "orderNo" SET NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "order" ADD CONSTRAINT "UQ_order_order_no" UNIQUE ("orderNo")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "order" DROP CONSTRAINT "UQ_order_order_no"
    `);
    await queryRunner.query(`
      ALTER TABLE "order" ALTER COLUMN "orderNo" DROP DEFAULT
    `);
    await queryRunner.query(`ALTER TABLE "order" DROP COLUMN "orderNo"`);
    await queryRunner.query(`DROP SEQUENCE IF EXISTS "order_order_no_seq"`);
  }
}
