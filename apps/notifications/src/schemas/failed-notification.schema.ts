import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { AbstractDocument } from '@app/common';
import { NotificationChannel } from '../types/notification.types';

@Schema({ timestamps: true, collection: 'failed_notifications' })
export class FailedNotificationDocument extends AbstractDocument {
  @Prop({ required: true, type: String, enum: NotificationChannel })
  channel!: NotificationChannel;

  @Prop({ required: true })
  notificationType!: string;

  @Prop({ required: true })
  recipient!: string;

  @Prop({ type: Object })
  metadata?: Record<string, unknown>;

  @Prop({ required: true })
  attemptsMade!: number;

  @Prop({ required: true, type: Object })
  originalPayload!: Record<string, unknown>;

  @Prop({ required: true })
  errorMessage!: string;

  @Prop({ type: Object })
  errorStack?: string | Record<string, unknown>;
}

export const FailedNotificationSchema = SchemaFactory.createForClass(FailedNotificationDocument);
