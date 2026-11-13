import { NestFactory } from '@nestjs/core';
import { AuthModule } from './auth.module';
import { Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { ValidationPipe } from '@nestjs/common';
import { GlobalHttpExceptionFilter, CorrelationIdMiddleware, HttpMetricsInterceptor, LoggerService } from '@app/core';

async function bootstrap() {
  const app = await NestFactory.create(AuthModule);
  app.enableShutdownHooks();
  const configService = app.get(ConfigService);

  app.use(helmet());
  app.enableCors({
    origin: (configService.get<string>('CORS_ORIGINS') ?? 'http://localhost:3000').split(',').map((o) => o.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  });
  app.use(cookieParser());

  const correlationMiddleware = new CorrelationIdMiddleware();
  app.use(correlationMiddleware.use.bind(correlationMiddleware));

  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  app.useGlobalInterceptors(new HttpMetricsInterceptor());
  const logger = await app.resolve(LoggerService);
  app.useGlobalFilters(new GlobalHttpExceptionFilter(logger));

  app.connectMicroservice({
    transport: Transport.TCP,
    options: {
      host: configService.get('AUTH_TCP_HOST'),
      port: configService.get('AUTH_TCP_PORT'),
    },
  });

  await app.startAllMicroservices();

  await app.listen(configService.get('AUTH_HTTP_PORT') as string);
}
bootstrap();
