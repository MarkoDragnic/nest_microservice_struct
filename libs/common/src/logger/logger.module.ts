import { Module, Global, DynamicModule } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LogDocument, LogSchema } from './schemas/log.schema';
import { LoggerService } from './logger.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import path from 'path';
import { InternalRpcGuard } from '../tcp/internal-rpc.guard';

@Global()
@Module({})
export class LoggerModule {
  static forRoot(): DynamicModule {
    const hasMongoUri = !!process.env.MONGODB_LOGGER_URI;

    const mongoImports = hasMongoUri
      ? [
          MongooseModule.forRootAsync({
            connectionName: 'logger-db',
            useFactory: (configService: ConfigService) => ({
              uri: configService.getOrThrow<string>('MONGODB_LOGGER_URI'),
            }),
            inject: [ConfigService],
          }),
          MongooseModule.forFeature([{ name: LogDocument.name, schema: LogSchema }], 'logger-db'),
        ]
      : [];

    return {
      module: LoggerModule,
      imports: [
        ConfigModule.forRoot({
          envFilePath: [path.resolve(process.cwd(), 'libs/common/.env')],
          expandVariables: true,
        }),
        ...mongoImports,
      ],
      providers: [LoggerService, InternalRpcGuard],
      exports: [LoggerService, InternalRpcGuard],
    };
  }
}
