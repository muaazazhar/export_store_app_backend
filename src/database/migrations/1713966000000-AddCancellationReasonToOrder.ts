import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCancellationReasonToOrder1713966000000
  implements MigrationInterface
{
  name = 'AddCancellationReasonToOrder1713966000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "order"
      ADD "cancellation_reason" character varying
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "order" DROP COLUMN "cancellation_reason"
    `);
  }
}
