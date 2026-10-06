import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitRobotsPositions1769990400000 implements MigrationInterface {
  name = 'InitRobotsPositions1769990400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS pgcrypto');

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "robot_type_enum" AS ENUM ('test', 'live');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "position_type_enum" AS ENUM ('test', 'live');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "position_status_enum" AS ENUM ('open', 'closed');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "position_close_reason_enum" AS ENUM (
          'exit order triggered (Stop lose, Take profit)',
          'manual',
          'strategy',
          'unknown'
        );
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "funds" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "initial" numeric NOT NULL,
        "value" numeric NOT NULL,
        "reserved" numeric NOT NULL DEFAULT 0,
        "base" text NOT NULL,
        "dynamic" boolean NOT NULL DEFAULT false,
        "partial" text NOT NULL,
        "size" numeric NOT NULL,
        CONSTRAINT "PK_funds_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "instrument" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" text NOT NULL,
        "symbol" text NOT NULL,
        CONSTRAINT "PK_instrument_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "robot" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "owner_id" uuid NOT NULL,
        "full_symbol" text NOT NULL,
        "name" text NOT NULL,
        "type" "robot_type_enum" NOT NULL,
        "assets" text NOT NULL,
        "active" boolean NULL DEFAULT false,
        "account_id" uuid NOT NULL,
        "hash" text NOT NULL,
        "funds_id" uuid NOT NULL,
        "instrument_id" uuid NOT NULL,
        "indicators" jsonb NULL,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_robot_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_robot_hash" UNIQUE ("hash"),
        CONSTRAINT "FK_robot_account" FOREIGN KEY ("account_id") REFERENCES "account"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "FK_robot_funds" FOREIGN KEY ("funds_id") REFERENCES "funds"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_robot_instrument" FOREIGN KEY ("instrument_id") REFERENCES "instrument"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "position" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "robot_id" uuid NOT NULL,
        "symbol" text NOT NULL,
        "type" "position_type_enum" NOT NULL,
        "status" "position_status_enum" NOT NULL,
        "entry_price" numeric NOT NULL,
        "close_price" numeric NULL,
        "opened_at" timestamptz NOT NULL,
        "closed_at" timestamptz NULL,
        "close_reason" "position_close_reason_enum" NULL,
        "quantity" numeric NOT NULL,
        "open_transaction_value" numeric NULL,
        "close_transaction_value" numeric NULL,
        "transaction" numeric NOT NULL,
        "rules" jsonb NULL,
        CONSTRAINT "PK_position_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_position_robot" FOREIGN KEY ("robot_id") REFERENCES "robot"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_position_robot_status_opened_at"
      ON "position" ("robot_id", "status", "opened_at" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_position_robot_status_opened_at"');
    await queryRunner.query('DROP TABLE IF EXISTS "position"');
    await queryRunner.query('DROP TABLE IF EXISTS "robot"');
    await queryRunner.query('DROP TABLE IF EXISTS "instrument"');
    await queryRunner.query('DROP TABLE IF EXISTS "funds"');

    await queryRunner.query('DROP TYPE IF EXISTS "position_close_reason_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "position_status_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "position_type_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "robot_type_enum"');
  }
}
