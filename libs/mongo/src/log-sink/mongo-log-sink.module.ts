import { Module, Global, DynamicModule, Provider } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { LOG_SINK } from '@app/core/logger';
import { LogDocument, LogSchema } from './log.schema';
import { MongoLogSink } from './mongo-log-sink';

// forRoot() reads MONGODB_LOGGER_URI from process.env when it is called. If the URI only shows up
// later, the app loaded its env files after this module was evaluated and Mongo logging would be
// silently off, so fail at startup instead.
const importOrderGuard: Provider = {
  provide: 'MONGO_LOG_SINK_IMPORT_ORDER_GUARD',
  useFactory: (configService?: ConfigService) => {
    if (configService?.get('MONGODB_LOGGER_URI')) {
      throw new Error(
        'MONGODB_LOGGER_URI was not set when MongoLogSinkModule.forRoot() ran, but it is set now. ' +
          'ConfigModule.forRoot must be the first import in the root module, before MongoLogSinkModule.forRoot().',
      );
    }
  },
  inject: [{ token: ConfigService, optional: true }],
};

// Must stay @Global and export LOG_SINK: LoggerService injects it as optional, so if the token
// is not visible to LoggerModule, logs silently stop going to Mongo.
@Global()
@Module({})
export class MongoLogSinkModule {
  static forRoot(): DynamicModule {
    const hasMongoUri = !!process.env.MONGODB_LOGGER_URI;

    if (!hasMongoUri) {
      return { module: MongoLogSinkModule, providers: [importOrderGuard] };
    }

    return {
      module: MongoLogSinkModule,
      imports: [
        MongooseModule.forRootAsync({
          connectionName: 'logger-db',
          useFactory: (configService: ConfigService) => ({
            uri: configService.getOrThrow<string>('MONGODB_LOGGER_URI'),
          }),
          inject: [ConfigService],
        }),
        MongooseModule.forFeature([{ name: LogDocument.name, schema: LogSchema }], 'logger-db'),
      ],
      providers: [{ provide: LOG_SINK, useClass: MongoLogSink }],
      exports: [LOG_SINK],
    };
  }
}
