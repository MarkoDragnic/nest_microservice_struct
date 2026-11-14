import { NestFactory } from '@nestjs/core';
import { PriceProviderModule } from './price-provider.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Transport } from '@nestjs/microservices';
import { startMetricsServer } from '@app/core';
async function bootstrap() {
  const app = await NestFactory.create(PriceProviderModule);
  app.enableShutdownHooks();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const configService = app.get(ConfigService);

  app.connectMicroservice({
    transport: Transport.TCP,
    options: {
      host: configService.get('PRICE_PROVIDER_TCP_HOST'),
      port: configService.get('PRICE_PROVIDER_TCP_PORT'),
    },
  });

  await app.init();
  await app.startAllMicroservices();
  await startMetricsServer(configService.get<number>('METRICS_PORT', 9010));
}

bootstrap();
