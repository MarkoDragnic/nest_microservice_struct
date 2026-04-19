import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MongoAbstractRepository } from '@app/common';
import { FailedNotificationDocument } from './schemas/failed-notification.schema';
import { LoggerService } from '@app/common/logger';

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
