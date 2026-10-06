import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import Joi from 'joi';
import path from 'path';
import { NotificationsTemplateService } from './notifications-template.service';
import { DatabaseMongooseModule, GlobalRpcExceptionFilter, HealthModule, LoggerModule, MongoLogSinkModule, KafkaDlqModule, redisSchema, kafkaSchema, mongoDbSchema, internalRpcSchema } from '@app/common';
import { FailedNotificationDocument, FailedNotificationSchema } from './schemas/failed-notification.schema';
import { FailedNotificationRepository } from './notification-faild.repository';
import { NotificationsProcessor } from './notifications.processor';
import { NOTIFICATION_QUEUE } from './types/queue.types';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        path.resolve(process.cwd(), 'apps/notifications/.env'),
        path.resolve(process.cwd(), 'env/logger.env'),
      ],
      validationSchema: Joi.object({
        ...redisSchema,
        ...kafkaSchema,
        ...mongoDbSchema,
        ...internalRpcSchema,
        INSTANCE_ID: Joi.string().required(),
        NOTIFICATION_TCP_HOST: Joi.string().optional().default('0.0.0.0'),
        NOTIFICATION_TCP_PORT: Joi.number().optional().default(30011),
        SMTP_USER: Joi.string().required(),
        GOOGLE_OAUTH_CLIENT_ID: Joi.string().required(),
        GOOGLE_OAUTH_CLIENT_SECRET: Joi.string().required(),
        GOOGLE_OAUTH_REFRESH_TOKEN: Joi.string().required(),
        NOTIFICATION_EMAIL_ATTEMPTS: Joi.number().integer().min(1).optional().default(5),
        NOTIFICATION_EMAIL_BACKOFF_TYPE: Joi.string().valid('fixed', 'exponential').optional().default('exponential'),
        NOTIFICATION_EMAIL_BACKOFF_DELAY_MS: Joi.number().integer().min(0).optional().default(30000),
      }),
    }),
    HealthModule.register(),
    MongoLogSinkModule.forRoot(),
    LoggerModule.forRoot(),
    KafkaDlqModule.register(),
    DatabaseMongooseModule,
    DatabaseMongooseModule.forMongooseFeature([
      { name: FailedNotificationDocument.name, schema: FailedNotificationSchema },
    ]),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST'),
          port: configService.get('REDIS_PORT'),
          password: configService.get('REDIS_PASSWORD') || undefined,
          username: configService.get('REDIS_USER') || undefined,
        },
      }),
    }),
    BullModule.registerQueue({
      name: NOTIFICATION_QUEUE,
    }),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsTemplateService, FailedNotificationRepository, NotificationsProcessor, GlobalRpcExceptionFilter],
})
export class NotificationsModule {}
