import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitAccount1769472000000 implements MigrationInterface {
  name = 'InitAccount1769472000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "account" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "user_id" uuid NOT NULL,
        "exchange" text NOT NULL,
        "environment" text NOT NULL,
        "api_key_encrypted" jsonb NOT NULL,
        "api_secret_encrypted" jsonb NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "revoked_at" timestamp NULL,
        CONSTRAINT "PK_account_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_account_user_exchange_environment" UNIQUE ("user_id", "exchange", "environment")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "account"');
  }
}
