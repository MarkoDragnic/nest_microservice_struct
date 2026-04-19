import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { AbstractDocument } from '@app/common/database';
import { LogSeverity } from '../types/logger.types';

@Schema({ collection: 'logs', timestamps: true })
export class LogDocument extends AbstractDocument {
  @Prop({ required: true, index: true })
  date: string;

  @Prop({ required: true, enum: LogSeverity, index: true })
  severity: string;

  @Prop({ required: true, index: true })
  service: string;

  @Prop({ required: true })
  message: string;

  @Prop({ type: Object, default: {} })
  metadata?: Record<string, any>;

  @Prop()
  stack?: string;

  @Prop({ required: true })
  timestamp: Date;
}

export const LogSchema = SchemaFactory.createForClass(LogDocument);

LogSchema.index({ date: -1, severity: 1, service: 1 });

LogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 }); // 90days
