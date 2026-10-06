import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({})
export class ClientKafkaProviderModule {
  static register(options: { name: string; brokers: string; groupId: string; clientId: string }) {
    const { name, brokers, groupId, clientId } = options;
    return {
      module: ClientKafkaProviderModule,
      imports: [
        ConfigModule,
        ClientsModule.registerAsync([
          {
            name,
            useFactory: (configService: ConfigService) => ({
              transport: Transport.KAFKA,
              options: {
                client: {
                  clientId: configService.get(clientId) as string,
                  brokers: configService
                    .get(brokers)
                    .split(',')
                    .map((broker) => broker.trim()),
                },
                consumer: {
                  groupId: configService.get(groupId) as string,
                },
              },
            }),
            inject: [ConfigService],
          },
        ]),
      ],
      exports: [ClientsModule],
    };
  }
}
