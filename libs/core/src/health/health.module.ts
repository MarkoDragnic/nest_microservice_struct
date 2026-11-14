import { Module, DynamicModule } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { InternalRpcGuardModule } from '../tcp';
import { HealthTcpController } from './health-tcp.controller';
import { HealthHttpController } from './health-http.controller';

export interface HealthModuleOptions {
  tcp?: boolean;
  http?: boolean;
}

@Module({})
export class HealthModule {
  static register(options: HealthModuleOptions = {}): DynamicModule {
    const controllers: any[] = [];
    const imports: any[] = [];

    if (options.tcp !== false) {
      controllers.push(HealthTcpController);
      imports.push(InternalRpcGuardModule);
    }

    if (options.http) {
      controllers.push(HealthHttpController);
      imports.push(TerminusModule);
    }

    return {
      module: HealthModule,
      imports,
      controllers,
    };
  }
}
