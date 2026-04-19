import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import {
  KAFKA_TOPICS,
  IKafkaEvent,
  NOTIFICATION_SERVICE,
  INotificationPositionMailDto,
  INotificationEventV1,
} from '@app/common';
@Injectable()
export class PositionNotificationService {
  private readonly logger = new Logger(PositionNotificationService.name);

  constructor(@Inject(NOTIFICATION_SERVICE) private readonly notificationClient: ClientProxy) {}

  async sendNotification(param: INotificationPositionMailDto) {
    const event: INotificationEventV1 = {
      schemaVersion: 1,
      eventType: KAFKA_TOPICS.SEND_NOTIFICATION,
      eventId: `${param.type}:${new Date().toISOString()}`,
      producedAt: new Date().toISOString(),
      content: param,
    };

    this.notificationClient
      .emit(KAFKA_TOPICS.SEND_NOTIFICATION, {
        key: param.type,
        value: event,
        headers: {},
      } as IKafkaEvent)
      .subscribe({ error: (err) => this.logger.error('Failed to emit notification', err?.message) });
  }
}
