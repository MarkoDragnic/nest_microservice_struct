import { Module } from '@nestjs/common';
import { ModelDefinition, MongooseModule } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { CandleStorageService, MongoDbFactory } from './mongo';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [MongoDbFactory, CandleStorageService],
  exports: [MongoDbFactory, CandleStorageService],
})
export class DatabaseMongooseModule {
  static forMongooseFeature(models: ModelDefinition[]) {
    return MongooseModule.forFeature(models);
  }
}
