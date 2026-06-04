import { MigrationInterface, QueryRunner } from 'typeorm';

export class MigrateIdsToUuid1713969000000 implements MigrationInterface {
  name = 'MigrateIdsToUuid1713969000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // --- users ---
    await queryRunner.query(`
      ALTER TABLE "users" ADD COLUMN "id_uuid" uuid NOT NULL DEFAULT gen_random_uuid()
    `);

    await queryRunner.query(`
      ALTER TABLE "order" ADD COLUMN "userId_uuid" uuid
    `);

    await queryRunner.query(`
      UPDATE "order" o
      SET "userId_uuid" = u."id_uuid"
      FROM "users" u
      WHERE o."userId" = u."id"
    `);

    await queryRunner.query(`
      ALTER TABLE "order" DROP CONSTRAINT "FK_order_user"
    `);

    await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "PK_users_id"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "id"`);
    await queryRunner.query(`
      ALTER TABLE "users" RENAME COLUMN "id_uuid" TO "id"
    `);
    await queryRunner.query(`
      ALTER TABLE "users" ADD CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
    `);

    await queryRunner.query(`ALTER TABLE "order" DROP COLUMN "userId"`);
    await queryRunner.query(`
      ALTER TABLE "order" RENAME COLUMN "userId_uuid" TO "userId"
    `);
    await queryRunner.query(`
      ALTER TABLE "order"
      ADD CONSTRAINT "FK_order_user"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    // --- category ---
    await queryRunner.query(`
      ALTER TABLE "category" ADD COLUMN "id_uuid" uuid NOT NULL DEFAULT gen_random_uuid()
    `);

    await queryRunner.query(`
      ALTER TABLE "product" ADD COLUMN "categoryId_uuid" uuid
    `);

    await queryRunner.query(`
      UPDATE "product" p
      SET "categoryId_uuid" = c."id_uuid"
      FROM "category" c
      WHERE p."categoryId" = c."id"
    `);

    await queryRunner.query(`
      ALTER TABLE "product" DROP CONSTRAINT "FK_product_category"
    `);

    await queryRunner.query(`
      ALTER TABLE "category" DROP CONSTRAINT "PK_category_id"
    `);
    await queryRunner.query(`ALTER TABLE "category" DROP COLUMN "id"`);
    await queryRunner.query(`
      ALTER TABLE "category" RENAME COLUMN "id_uuid" TO "id"
    `);
    await queryRunner.query(`
      ALTER TABLE "category" ADD CONSTRAINT "PK_category_id" PRIMARY KEY ("id")
    `);

    await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "categoryId"`);
    await queryRunner.query(`
      ALTER TABLE "product" RENAME COLUMN "categoryId_uuid" TO "categoryId"
    `);
    await queryRunner.query(`
      ALTER TABLE "product"
      ADD CONSTRAINT "FK_product_category"
      FOREIGN KEY ("categoryId") REFERENCES "category"("id")
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    // --- product ---
    await queryRunner.query(`
      ALTER TABLE "product" ADD COLUMN "id_uuid" uuid NOT NULL DEFAULT gen_random_uuid()
    `);

    await queryRunner.query(`
      DO $$
      DECLARE
        ord RECORD;
        elem jsonb;
        new_items jsonb;
        mapped_uuid text;
      BEGIN
        FOR ord IN SELECT id, items FROM "order" LOOP
          new_items := '[]'::jsonb;
          FOR elem IN
            SELECT value FROM jsonb_array_elements(ord.items::jsonb) AS value
          LOOP
            SELECT p."id_uuid"::text INTO mapped_uuid
            FROM "product" p
            WHERE p.id = (elem->>'productId')::integer;

            IF mapped_uuid IS NOT NULL THEN
              elem := jsonb_set(elem, '{productId}', to_jsonb(mapped_uuid));
            END IF;
            new_items := new_items || elem;
          END LOOP;
          UPDATE "order" SET items = new_items::json WHERE id = ord.id;
        END LOOP;
      END $$;
    `);

    await queryRunner.query(`ALTER TABLE "product" DROP CONSTRAINT "PK_product_id"`);
    await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "id"`);
    await queryRunner.query(`
      ALTER TABLE "product" RENAME COLUMN "id_uuid" TO "id"
    `);
    await queryRunner.query(`
      ALTER TABLE "product" ADD CONSTRAINT "PK_product_id" PRIMARY KEY ("id")
    `);

    // --- order ---
    await queryRunner.query(`
      ALTER TABLE "order" ADD COLUMN "id_uuid" uuid NOT NULL DEFAULT gen_random_uuid()
    `);

    await queryRunner.query(`ALTER TABLE "order" DROP CONSTRAINT "PK_order_id"`);
    await queryRunner.query(`ALTER TABLE "order" DROP COLUMN "id"`);
    await queryRunner.query(`
      ALTER TABLE "order" RENAME COLUMN "id_uuid" TO "id"
    `);
    await queryRunner.query(`
      ALTER TABLE "order" ADD CONSTRAINT "PK_order_id" PRIMARY KEY ("id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    throw new Error('MigrateIdsToUuid1713969000000 cannot be reverted safely');
  }
}
