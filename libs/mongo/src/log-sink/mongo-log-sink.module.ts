import { Module, Global, DynamicModule } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { LOG_SINK } from '@app/core/logger';
import { LogDocument, LogSchema } from './log.schema';
import { MongoLogSink } from './mongo-log-sink';

// Must stay @Global and export LOG_SINK: LoggerService injects it as optional, so if the token
// is not visible to LoggerModule, logs silently stop going to Mongo.
@Global()
@Module({})
export class MongoLogSinkModule {
  static forRoot(): DynamicModule {
    const hasMongoUri = !!process.env.MONGODB_LOGGER_URI;

    if (!hasMongoUri) {
      return { module: MongoLogSinkModule };
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
