import { NestFactory } from '@nestjs/core';
import { NotificationsModule } from './notifications.module';
import { Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { startMetricsServer } from '@app/common';
async function bootstrap() {
  const app = await NestFactory.create(NotificationsModule);
  app.enableShutdownHooks();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  const configService = app.get(ConfigService);
  app.connectMicroservice({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: configService.get('INSTANCE_ID'),
        brokers: configService
          .get('KAFKA_BROKERS')
          .split(',')
          .map((b) => b.trim()),
      },
      consumer: {
        groupId: configService.get('KAFKA_CONSUMER_GROUP') ?? 'notifications-consumer',
      },
      run: {
        autoCommit: true,
      },
    },
  });

  app.connectMicroservice({
    transport: Transport.TCP,
    options: {
      host: configService.get('NOTIFICATION_TCP_HOST'),
      port: configService.get('NOTIFICATION_TCP_PORT'),
    },
  });

  await app.startAllMicroservices();
  await startMetricsServer(configService.get<number>('METRICS_PORT', 9008));
}
bootstrap();
