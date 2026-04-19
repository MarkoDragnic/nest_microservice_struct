import { NestFactory } from '@nestjs/core';
import { RobotsModule } from './robots.module';
import { Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { startMetricsServer } from '@app/common';
async function bootstrap() {
  const app = await NestFactory.create(RobotsModule);
  app.enableShutdownHooks();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  const configService = app.get(ConfigService);
  app.connectMicroservice({
    transport: Transport.TCP,
    options: {
      host: configService.get('ROBOTS_TCP_HOST'),
      port: configService.get('ROBOTS_TCP_PORT'),
    },
  });

  await app.startAllMicroservices();
  await startMetricsServer(configService.get<number>('METRICS_PORT', 9004));
}
bootstrap();
