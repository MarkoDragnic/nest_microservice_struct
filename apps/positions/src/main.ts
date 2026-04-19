import { NestFactory } from '@nestjs/core';
import { PositionsModule } from './positions.module';
import { ConfigService } from '@nestjs/config';
import { Transport } from '@nestjs/microservices';
import { ValidationPipe } from '@nestjs/common';
import { startMetricsServer } from '@app/common';
async function bootstrap() {
  const app = await NestFactory.create(PositionsModule);
  app.enableShutdownHooks();
  const configService = app.get(ConfigService);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  app.connectMicroservice({
    transport: Transport.TCP,
    options: {
      host: configService.get('POSITION_TCP_HOST'),
      port: configService.get('POSITION_TCP_PORT'),
    },
  });

  await app.startAllMicroservices();
  await startMetricsServer(configService.get<number>('METRICS_PORT', 9005));
}
bootstrap();
