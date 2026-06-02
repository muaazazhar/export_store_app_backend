import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmailVerificationToUsers1713965000000
  implements MigrationInterface
{
  name = 'AddEmailVerificationToUsers1713965000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD "isVerified" boolean NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD "verificationTokenHash" character varying
    `);
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD "verificationTokenExpiresAt" TIMESTAMP
    `);
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD "verificationSentAt" TIMESTAMP
    `);

    await queryRunner.query(`
      UPDATE "users"
      SET "isVerified" = true
      WHERE "role" = 'admin'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "verificationSentAt"`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN "verificationTokenExpiresAt"`,
    );
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "verificationTokenHash"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "isVerified"`);
  }
}
