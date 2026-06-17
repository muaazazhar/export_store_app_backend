import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPhoneAndPasswordResetToUsers1713975000000
  implements MigrationInterface
{
  name = 'AddPhoneAndPasswordResetToUsers1713975000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "phone" character varying(20),
      ADD COLUMN "phoneVerified" boolean NOT NULL DEFAULT false,
      ADD COLUMN "passwordResetCodeHash" character varying,
      ADD COLUMN "passwordResetCodeExpiresAt" TIMESTAMP WITH TIME ZONE,
      ADD COLUMN "passwordResetSentAt" TIMESTAMP WITH TIME ZONE,
      ADD COLUMN "passwordResetAttempts" integer NOT NULL DEFAULT 0,
      ADD COLUMN "passwordResetTokenHash" character varying,
      ADD COLUMN "passwordResetTokenExpiresAt" TIMESTAMP WITH TIME ZONE
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      ADD CONSTRAINT "UQ_users_phone" UNIQUE ("phone")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" DROP CONSTRAINT "UQ_users_phone"
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN "phone",
      DROP COLUMN "phoneVerified",
      DROP COLUMN "passwordResetCodeHash",
      DROP COLUMN "passwordResetCodeExpiresAt",
      DROP COLUMN "passwordResetSentAt",
      DROP COLUMN "passwordResetAttempts",
      DROP COLUMN "passwordResetTokenHash",
      DROP COLUMN "passwordResetTokenExpiresAt"
    `);
  }
}
