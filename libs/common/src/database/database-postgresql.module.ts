import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EntityClassOrSchema } from '@nestjs/typeorm/dist/interfaces/entity-class-or-schema.type';
import { POSTGRES_MIGRATIONS } from './postgresql/migrations';
import path from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: [path.resolve(process.cwd(), 'libs/common/.env')],
      expandVariables: true,
    }),
    TypeOrmModule.forRootAsync({
      useFactory: (configService: ConfigService) => {
        const migrationsRun = configService.get('POSTGRES_MIGRATIONS_RUN') === 'true';
        const ssl = configService.get('POSTGRES_SSL') === 'true';
        const synchronize = configService.get('POSTGRES_SYNCHRONIZE') === 'true';
        const postgresHost = configService.getOrThrow<string>('POSTGRES_HOST');
        const postgresPort = +configService.getOrThrow<number>('POSTGRES_PORT');
        const postgresDb = configService.getOrThrow<string>('POSTGRES_DB');
        const postgresUser = configService.getOrThrow<string>('POSTGRES_USER');
        const postgresPassword = configService.getOrThrow<string>('POSTGRES_PASSWORD');

        return {
          migrationsRun,
          type: 'postgres',
          host: postgresHost,
          port: postgresPort,
          database: postgresDb,
          username: postgresUser,
          password: postgresPassword,
          ssl: ssl ? { rejectUnauthorized: false } : false,
          autoLoadEntities: true,
          synchronize: migrationsRun ? false : synchronize,
          migrations: [...POSTGRES_MIGRATIONS],
          migrationsTableName: 'migrations',
          migrationsTransactionMode: 'all',
        };
      },
      inject: [ConfigService],
    }),
  ],
})
export class DatabasePostgresqlModule {
  static forFeature(models: EntityClassOrSchema[]) {
    return TypeOrmModule.forFeature(models);
  }
}
