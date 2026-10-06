import { Controller, UseFilters } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { ConfigService } from '@nestjs/config';
import { EventPattern, Payload, Transport } from '@nestjs/microservices';
import { KAFKA_TOPICS, type INotificationEventV1 } from '@app/contracts';
import { GlobalRpcExceptionFilter, LoggerService } from '@app/core';
import { KafkaDlqService } from '@app/messaging';
import { NotifyEmailDto } from './types/email-notification.types';
import { NotificationsTemplateService } from './notifications-template.service';
import { NotificationChannel } from './types/notification.types';
import { NOTIFICATION_QUEUE, QueueType } from './types/queue.types';

@UseFilters(GlobalRpcExceptionFilter)
@Controller()
export class NotificationsController {
  private readonly emailAttempts: number;
  private readonly emailBackoffType: 'fixed' | 'exponential';
  private readonly emailBackoffDelayMs: number;

  constructor(
    @InjectQueue(NOTIFICATION_QUEUE) private readonly notificationQueue: Queue,
    private readonly templateService: NotificationsTemplateService,
    private readonly logger: LoggerService,
    private readonly configService: ConfigService,
    private readonly dlq: KafkaDlqService,
  ) {
    this.logger.setContext(NotificationsController.name);
    this.emailAttempts = this.configService.get<number>('NOTIFICATION_EMAIL_ATTEMPTS', 5);
    this.emailBackoffType = this.configService.get<'fixed' | 'exponential'>(
      'NOTIFICATION_EMAIL_BACKOFF_TYPE',
      'exponential',
    );
    this.emailBackoffDelayMs = this.configService.get<number>('NOTIFICATION_EMAIL_BACKOFF_DELAY_MS', 30000);
  }

  @EventPattern(KAFKA_TOPICS.SEND_NOTIFICATION, Transport.KAFKA)
  async sendNotification(@Payload() data: INotificationEventV1) {
    try {
      if (data.content.data.user.notifyByEmail) {
        const convert: NotifyEmailDto = this.templateService.getMailTemplate(data.content);

        await this.notificationQueue.add(
          QueueType.SEND_EMAIL,
          {
            channel: NotificationChannel.EMAIL,
            notificationType: data.content.type,
            email: convert,
            originalPayload: data,
          },
          {
            attempts: this.emailAttempts,
            backoff: {
              type: this.emailBackoffType,
              delay: this.emailBackoffDelayMs,
            },
            removeOnComplete: true,
            removeOnFail: false,
          },
        );
        this.logger.log('Email queued', { recipient: convert.email, type: data.content.type });
      }
    } catch (error) {
      this.logger.error('Error sending notification', { error: error?.message, stack: error?.stack });
      this.dlq.publish(KAFKA_TOPICS.SEND_NOTIFICATION, data, error);
    }
  }
}
