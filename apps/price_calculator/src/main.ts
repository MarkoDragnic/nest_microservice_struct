import { NestFactory } from '@nestjs/core';
import { PriceCalculatorModule } from './price_calculator.module';
import { ConfigService } from '@nestjs/config';
import { Transport } from '@nestjs/microservices';
import { ValidationPipe } from '@nestjs/common';
import { startMetricsServer } from '@app/core';
async function bootstrap() {
  const app = await NestFactory.create(PriceCalculatorModule);
  app.enableShutdownHooks();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  const configService = app.get(ConfigService);

  app.connectMicroservice({
    transport: Transport.TCP,
    options: {
      host: configService.get('CALCULATOR_TCP_HOST'),
      port: configService.get('CALCULATOR_TCP_PORT'),
    },
  });

  await app.init();
  await app.startAllMicroservices();
  await startMetricsServer(configService.get<number>('METRICS_PORT', 9009));
}
bootstrap();
