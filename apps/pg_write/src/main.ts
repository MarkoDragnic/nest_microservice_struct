import { NestFactory } from '@nestjs/core';
import { PgWriteModule } from './pg_write.module';
import { ConfigService } from '@nestjs/config';
import { Transport } from '@nestjs/microservices';
import { ValidationPipe } from '@nestjs/common';
import { startMetricsServer } from '@app/common';
async function bootstrap() {
  const app = await NestFactory.create(PgWriteModule);
  app.enableShutdownHooks();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  const configService = app.get(ConfigService);

  app.connectMicroservice({
    transport: Transport.TCP,
    options: {
      host: configService.get('PG_WRITE_TCP_HOST'),
      port: configService.get('PG_WRITE_TCP_PORT'),
    },
  });

  await app.init();
  await app.startAllMicroservices();
  await startMetricsServer(configService.get<number>('METRICS_PORT', 9001));
}
bootstrap();
