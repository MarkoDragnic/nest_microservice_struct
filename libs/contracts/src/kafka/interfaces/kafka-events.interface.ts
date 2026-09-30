import { KAFKA_TOPICS } from '../kafka-topics';
import { ICandleWithIndicators, INotificationPositionMailDto } from '@app/contracts/interfaces';

export interface IKafkaEvent {
  key: string;
  value: INotificationEventV1 | IIndicatorTriggerEventV1;
  headers: Record<string, any>;
}

export interface IIndicatorTriggerEventV1 {
  schemaVersion: 1;
  eventType: typeof KAFKA_TOPICS.INDICATOR_TRIGGER;
  eventId: string;
  producedAt: string;
  candle: ICandleWithIndicators;
}

export interface INotificationEventV1 {
  schemaVersion: 1;
  eventType: typeof KAFKA_TOPICS.SEND_NOTIFICATION;
  eventId: string;
  producedAt: string;
  content: INotificationPositionMailDto;
}
