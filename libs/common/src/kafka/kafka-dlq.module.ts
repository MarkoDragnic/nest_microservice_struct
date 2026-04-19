import { DynamicModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { KafkaDlqService, KAFKA_DLQ_CLIENT } from './kafka-dlq.service';

@Module({})
export class KafkaDlqModule {
  static register(): DynamicModule {
    return {
      module: KafkaDlqModule,
      imports: [
        ConfigModule,
        ClientsModule.registerAsync([
          {
            name: KAFKA_DLQ_CLIENT,
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
              transport: Transport.KAFKA,
              options: {
                client: {
                  clientId: `${config.get<string>('INSTANCE_ID', 'app')}-dlq`,
                  brokers: config
                    .getOrThrow<string>('KAFKA_BROKERS')
                    .split(',')
                    .map((b) => b.trim()),
                },
              },
            }),
          },
        ]),
      ],
      providers: [KafkaDlqService],
      exports: [KafkaDlqService],
    };
  }
}
