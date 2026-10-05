import { Module, Global, DynamicModule } from '@nestjs/common';
import { LoggerService } from './logger.service';
import { ConfigModule } from '@nestjs/config';
import path from 'path';

@Global()
@Module({})
export class LoggerModule {
  static forRoot(): DynamicModule {
    return {
      module: LoggerModule,
      imports: [
        ConfigModule.forRoot({
          envFilePath: [path.resolve(process.cwd(), 'libs/common/.env')],
          expandVariables: true,
        }),
      ],
      providers: [LoggerService],
      exports: [LoggerService],
    };
  }
}
