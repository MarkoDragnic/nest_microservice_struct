import { NestFactory } from '@nestjs/core';
import { GatewayModule } from './gateway.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { LoggerService } from '@app/common/logger';
import { GlobalHttpExceptionFilter, CorrelationIdMiddleware, HttpMetricsInterceptor } from '@app/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(GatewayModule);
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

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Trading Platform API')
    .setDescription('API Gateway for the trading microservices platform')
    .setVersion('1.0')
    .addCookieAuth('Authentication')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(configService.get<string>('HTTP_PORT') as string);
}
bootstrap();
