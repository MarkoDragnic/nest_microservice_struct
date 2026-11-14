import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { LoggerService } from '@app/core';
import { MongoAbstractRepository } from '@app/mongo';
import { FailedNotificationDocument } from './schemas/failed-notification.schema';

@Injectable()
export class FailedNotificationRepository extends MongoAbstractRepository<FailedNotificationDocument> {
  constructor(
    @InjectModel(FailedNotificationDocument.name)
    failedNotificationModel: Model<FailedNotificationDocument>,
    protected readonly logger: LoggerService,
  ) {
    super(failedNotificationModel);
    this.logger.setContext(FailedNotificationRepository.name);
  }
}
