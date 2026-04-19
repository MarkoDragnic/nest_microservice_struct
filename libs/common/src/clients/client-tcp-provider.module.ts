import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ClientTcpService } from './client-tcp.service';

@Module({})
export class ClientTcpProviderService {
  static register(options: { name: string; host: string; port: string }): DynamicModule {
    const { name, host, port } = options;

    return {
      module: ClientTcpProviderService,
      imports: [
        ConfigModule,
        ClientsModule.registerAsync([
          {
            name: name,
            useFactory: (configService: ConfigService) => ({
              transport: Transport.TCP,
              options: {
                host: configService.get(host),
                port: configService.get(port),
              },
            }),
            inject: [ConfigService],
          },
        ]),
      ],
      providers: [ClientTcpService],
      exports: [ClientsModule, ClientTcpService],
    };
  }
}
