import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1713960000000 implements MigrationInterface {
  name = 'InitialSchema1713960000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" SERIAL NOT NULL,
        "email" character varying NOT NULL,
        "password" character varying NOT NULL,
        "role" character varying NOT NULL DEFAULT 'user',
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "category" (
        "id" SERIAL NOT NULL,
        "name" character varying NOT NULL,
        CONSTRAINT "PK_category_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "product" (
        "id" SERIAL NOT NULL,
        "name" character varying NOT NULL,
        "price" numeric NOT NULL,
        "categoryId" integer,
        CONSTRAINT "PK_product_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "order" (
        "id" SERIAL NOT NULL,
        "address" character varying NOT NULL,
        "items" json NOT NULL,
        "receiptNumber" character varying NOT NULL,
        "totalAmount" numeric(12,2) NOT NULL DEFAULT '0',
        "status" character varying NOT NULL DEFAULT 'pending',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "userId" integer,
        CONSTRAINT "UQ_order_receipt_number" UNIQUE ("receiptNumber"),
        CONSTRAINT "PK_order_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "product"
      ADD CONSTRAINT "FK_product_category"
      FOREIGN KEY ("categoryId") REFERENCES "category"("id")
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "order"
      ADD CONSTRAINT "FK_order_user"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "order" DROP CONSTRAINT "FK_order_user"
    `);
    await queryRunner.query(`
      ALTER TABLE "product" DROP CONSTRAINT "FK_product_category"
    `);
    await queryRunner.query(`
      DROP TABLE "order"
    `);
    await queryRunner.query(`
      DROP TABLE "product"
    `);
    await queryRunner.query(`
      DROP TABLE "category"
    `);
    await queryRunner.query(`
      DROP TABLE "users"
    `);
  }
}
