import { NestFactory } from '@nestjs/core';
import { IndicatorsModule } from './indicators.module';
import { ConfigService } from '@nestjs/config';
import { Transport } from '@nestjs/microservices';
import { LoggerService, startMetricsServer } from '@app/core';
import { ValidationPipe } from '@nestjs/common';
async function bootstrap() {
  const app = await NestFactory.create(IndicatorsModule);
  app.enableShutdownHooks();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  const configService = app.get(ConfigService);

  const instanceId = configService.get<string>('INSTANCE_ID') ?? 'indicators';
  const groupId = configService.get<string>('KAFKA_CONSUMER_GROUP') ?? 'indicators-consumer';

  const kafkaMicroservice = app.connectMicroservice({
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
        autoCommit: true,
      },
    },
  });

  app.connectMicroservice({
    transport: Transport.TCP,
    options: {
      host: configService.get('INDICATORS_TCP_HOST'),
      port: configService.get('INDICATORS_TCP_PORT'),
    },
  });

  await app.init();
  await app.startAllMicroservices();
  await startMetricsServer(configService.get<number>('METRICS_PORT', 9007));
}
bootstrap();
