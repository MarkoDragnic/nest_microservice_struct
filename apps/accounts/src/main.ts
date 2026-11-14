import { NestFactory } from '@nestjs/core';
import { AccountsModule } from './accounts.module';
import { ConfigService } from '@nestjs/config';
import { Transport } from '@nestjs/microservices';
import { ValidationPipe } from '@nestjs/common';
import { startMetricsServer } from '@app/core';
async function bootstrap() {
  const app = await NestFactory.create(AccountsModule);
  app.enableShutdownHooks();

  const configService = app.get(ConfigService);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  app.connectMicroservice({
    transport: Transport.TCP,
    options: {
      host: configService.get('ACCOUNT_TCP_HOST'),
      port: configService.get('ACCOUNT_TCP_PORT'),
    },
  });

  await app.startAllMicroservices();
  await startMetricsServer(configService.get<number>('METRICS_PORT', 9003));
}
bootstrap();
