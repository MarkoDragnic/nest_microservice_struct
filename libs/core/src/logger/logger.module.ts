import { Module, Global, DynamicModule } from '@nestjs/common';
import { LoggerService } from './logger.service';

@Global()
@Module({})
export class LoggerModule {
  static forRoot(): DynamicModule {
    return {
      module: LoggerModule,
      providers: [LoggerService],
      exports: [LoggerService],
    };
  }
}
