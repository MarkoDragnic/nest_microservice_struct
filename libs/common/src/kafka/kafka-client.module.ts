import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';

export type KafkaClientModuleOptions = {
  name: string;
  clientIdKey?: string;
  brokersKey?: string;
  consumerGroupKey?: string;
};

@Module({})
export class KafkaClientModule {
  static register(options: KafkaClientModuleOptions): DynamicModule {
    const {
      name,
      clientIdKey = 'INSTANCE_ID',
      brokersKey = 'KAFKA_BROKERS',
      consumerGroupKey = 'KAFKA_CONSUMER_GROUP',
    } = options;

    return {
      module: KafkaClientModule,
      imports: [
        ConfigModule,
        ClientsModule.registerAsync([
          {
            name,
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
              transport: Transport.KAFKA,
              options: {
                client: {
                  clientId: config.get<string>(clientIdKey) ?? name,
                  brokers: config
                    .getOrThrow<string>(brokersKey)
                    .split(',')
                    .map((broker) => broker.trim()),
                },
                consumer: {
                  groupId: config.getOrThrow<string>(consumerGroupKey),
                },
              },
            }),
          },
        ]),
      ],
      exports: [ClientsModule],
    };
  }
}
