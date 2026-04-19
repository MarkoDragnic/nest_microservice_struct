import { NestFactory } from '@nestjs/core';
import { TraderModule } from './trader.module';
import { ConfigService } from '@nestjs/config';
import { Transport } from '@nestjs/microservices';
import { randomUUID } from 'crypto';
import { ValidationPipe } from '@nestjs/common';
import { startMetricsServer } from '@app/common';
async function bootstrap() {
  const app = await NestFactory.create(TraderModule);
  app.enableShutdownHooks();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  const configService = app.get(ConfigService);

  const instanceId = configService.get<string>('INSTANCE_ID') ?? `trader-${randomUUID()}`;
  const groupId = configService.get<string>('KAFKA_CONSUMER_GROUP') ?? 'trader-consumer';
  app.connectMicroservice({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: instanceId,
        brokers: configService
          .get('KAFKA_BROKERS')
          .split(',')
          .map((b) => b.trim()),
      },
      consumer: {
        groupId,
      },
      subscribe: {
        fromBeginning: false,
      },
      run: {
        autoCommit: false,
      },
    },
  });

  app.connectMicroservice({
    transport: Transport.TCP,
    options: {
      host: configService.get('TRADER_TCP_HOST'),
      port: configService.get('TRADER_TCP_PORT'),
    },
  });

  await app.startAllMicroservices();
  await startMetricsServer(configService.get<number>('METRICS_PORT', 9006));
}
bootstrap();
