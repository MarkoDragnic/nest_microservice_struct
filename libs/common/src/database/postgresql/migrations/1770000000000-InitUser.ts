import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitUser1770000000000 implements MigrationInterface {
  name = 'InitUser1770000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "user" (
        "id"             uuid      NOT NULL DEFAULT gen_random_uuid(),
        "email"          text      NOT NULL,
        "password"       text      NOT NULL,
        "roles"          text[]    NULL,
        "notify_by_mail" boolean   NOT NULL DEFAULT false,
        "created_at"     timestamp NOT NULL DEFAULT now(),
        "updated_at"     timestamp NOT NULL DEFAULT now(),
        "is_active"      boolean   NOT NULL DEFAULT true,
        CONSTRAINT "PK_user_id"    PRIMARY KEY ("id"),
        CONSTRAINT "UQ_user_email" UNIQUE ("email")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "robot"
      ADD CONSTRAINT "FK_robot_owner"
      FOREIGN KEY ("owner_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "robot" DROP CONSTRAINT "FK_robot_owner"`);
    await queryRunner.query(`DROP TABLE "user"`);
  }
}
