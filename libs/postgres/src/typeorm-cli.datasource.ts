import 'reflect-metadata';

import * as fs from 'fs';
import * as path from 'path';
import { config as dotenvConfig } from 'dotenv';

import { DataSource } from 'typeorm';

import * as PostgresEntities from './models';
import { POSTGRES_MIGRATIONS } from './migrations';

const configuredEnvFile = process.env.TYPEORM_ENV_FILE || process.env.npm_package_config_typeormEnvFile || '.env';

const resolvedEnvFile = path.isAbsolute(configuredEnvFile)
  ? configuredEnvFile
  : path.resolve(process.cwd(), configuredEnvFile);

if (fs.existsSync(resolvedEnvFile)) {
  dotenvConfig({ path: resolvedEnvFile });
} else {
  throw new Error(
    `TypeORM CLI env file not found at: ${resolvedEnvFile}. ` +
      `Set package.json config.typeormEnvFile or export TYPEORM_ENV_FILE to point at an existing .env.`,
  );
}

const parseBoolean = (value: string | undefined): boolean => {
  if (!value) return false;
  return ['true', '1', 'yes', 'y', 'on'].includes(value.trim().toLowerCase());
};

const entities = Object.values(PostgresEntities as Record<string, unknown>).filter(
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  (value): value is Function => typeof value === 'function',
);

export default new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST,
  port: process.env.POSTGRES_PORT ? Number(process.env.POSTGRES_PORT) : 5432,
  database: process.env.POSTGRES_DB,
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  ssl: parseBoolean(process.env.POSTGRES_SSL) ? { rejectUnauthorized: false } : false,
  synchronize: false,

  entities: entities as any,

  migrations: [...POSTGRES_MIGRATIONS],
  migrationsTableName: 'migrations',
  migrationsTransactionMode: 'all',
});
