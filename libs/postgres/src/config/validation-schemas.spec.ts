import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { TYPEORM_MODULE_OPTIONS } from '@nestjs/typeorm/dist/typeorm.constants';
import Joi from 'joi';
import { DataSource } from 'typeorm';
import { DatabasePostgresqlModule } from '../database-postgresql.module';
import { postgresSchema } from './validation-schemas';

const validEnv: Record<string, string> = {
  POSTGRES_HOST: 'localhost',
  POSTGRES_PORT: '5432',
  POSTGRES_DB: 'app_db',
  POSTGRES_USER: 'app_user',
  POSTGRES_PASSWORD: 'app_password',
  POSTGRES_SSL: 'false',
  POSTGRES_SYNCHRONIZE: 'false',
  POSTGRES_MIGRATIONS_RUN: 'false',
};

const FLAGS = ['POSTGRES_SSL', 'POSTGRES_SYNCHRONIZE', 'POSTGRES_MIGRATIONS_RUN'];

const failingKeys = (env: Record<string, string>) =>
  Joi.object(postgresSchema)
    .validate(env, { abortEarly: false })
    .error?.details.map((detail) => detail.path[0]) ?? [];

describe('postgresSchema', () => {
  it('accepts a complete set of values', () => {
    expect(failingKeys(validEnv)).toEqual([]);
  });

  it.each(['POSTGRES_HOST', 'POSTGRES_PORT', 'POSTGRES_DB', 'POSTGRES_USER', 'POSTGRES_PASSWORD'])(
    'requires %s',
    (key) => {
      const env = { ...validEnv };
      delete env[key];

      expect(failingKeys(env)).toEqual([key]);
    },
  );

  it('rejects a port that is not a number', () => {
    expect(failingKeys({ ...validEnv, POSTGRES_PORT: 'five-four-three-two' })).toEqual(['POSTGRES_PORT']);
  });

  it('allows the three flags to be left out', () => {
    const env = { ...validEnv };
    FLAGS.forEach((flag) => delete env[flag]);

    expect(failingKeys(env)).toEqual([]);
  });

  it.each(FLAGS)('rejects a %s value other than true or false', (flag) => {
    expect(failingKeys({ ...validEnv, [flag]: 'yes' })).toEqual([flag]);
  });

  describe('with DatabasePostgresqlModule', () => {
    const savedEnv = { ...process.env };

    afterEach(() => {
      Object.keys(validEnv).forEach((key) => {
        if (savedEnv[key] === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = savedEnv[key];
        }
      });
    });

    // The module compares the flags with the string 'true', and ConfigService returns validated values.
    it('keeps flags set to true switched on after validation', async () => {
      Object.assign(process.env, validEnv, { POSTGRES_SSL: 'true', POSTGRES_MIGRATIONS_RUN: 'true' });

      const moduleRef = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, validationSchema: Joi.object(postgresSchema) }),
          DatabasePostgresqlModule,
        ],
      })
        // No database in unit tests: the options factory still runs, only the connection is replaced.
        .overrideProvider(DataSource)
        .useValue({ isInitialized: false })
        .compile();

      expect(moduleRef.get(TYPEORM_MODULE_OPTIONS, { strict: false })).toMatchObject({
        host: 'localhost',
        port: 5432,
        database: 'app_db',
        migrationsRun: true,
        ssl: { rejectUnauthorized: false },
      });

      await moduleRef.close();
    });
  });
});
