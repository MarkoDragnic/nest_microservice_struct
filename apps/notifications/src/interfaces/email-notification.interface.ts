import { NotifyEmailDto } from '../types/email-notification.types';
import { NotificationChannel } from '../types/notification.types';

export interface IEmailJobData {
  channel: NotificationChannel;
  notificationType: string;
  email: NotifyEmailDto;
  originalPayload: Record<string, unknown>;
}
