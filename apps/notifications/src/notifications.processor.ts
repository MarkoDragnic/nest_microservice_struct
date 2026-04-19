import { Process, Processor, OnQueueFailed, OnQueueCompleted } from '@nestjs/bull';
import { NotificationsService } from './notifications.service';
import { FailedNotificationRepository } from './notification-faild.repository';
import { IEmailJobData } from './interfaces/email-notification.interface';
import { type Job } from 'bull';
import { NOTIFICATION_QUEUE, QueueType } from './types/queue.types';
import { LoggerService } from '@app/common/logger';

@Processor(NOTIFICATION_QUEUE)
export class NotificationsProcessor {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly failedNotificationRepository: FailedNotificationRepository,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(NotificationsProcessor.name);
  }

  @Process(QueueType.SEND_EMAIL)
  async handleSendMailJob(job: Job<IEmailJobData>) {
    const { email } = job.data;

    this.logger.log('Processing email', {
      recipient: email.email,
      attempt: job.attemptsMade + 1,
      maxAttempts: job.opts.attempts,
    });

    try {
      await this.notificationsService.sendEmailNotification(email);
      this.logger.log('Email sent successfully', { recipient: email.email });
    } catch (error) {
      this.logger.error('Failed to send email', {
        recipient: email.email,
        attempt: job.attemptsMade + 1,
        error: error?.message,
        stack: error?.stack,
      });
      throw error;
    }
  }

  @OnQueueCompleted()
  async onCompleted(job: Job<IEmailJobData>) {
    this.logger.log('Email job completed', { jobId: job.id, recipient: job.data.email.email });
  }

  @OnQueueFailed()
  async handleFailedJob(job: Job<IEmailJobData>, error: Error) {
    const maxAttempts = typeof job.opts.attempts === 'number' && job.opts.attempts > 0 ? job.opts.attempts : 1;
    const isPermanentFailure = job.attemptsMade >= maxAttempts;

    if (!isPermanentFailure) {
      this.logger.warn('Email job failed and will be retried', {
        jobId: job.id,
        attempts: job.attemptsMade,
        maxAttempts,
        recipient: job.data.email.email,
        error: error.message,
      });
      return;
    }

    this.logger.warn('Email job failed permanently', {
      jobId: job.id,
      attempts: job.attemptsMade,
      maxAttempts,
      recipient: job.data.email.email,
    });

    const { channel, notificationType, email, originalPayload } = job.data;

    try {
      await this.failedNotificationRepository.create({
        channel,
        notificationType,
        recipient: email.email,
        metadata: {
          subject: email.subject,
          text: email.text,
        },
        attemptsMade: job.attemptsMade,
        originalPayload,
        errorMessage: error.message,
        errorStack: error.stack,
      });

      this.logger.notice('Failed notification saved for manual review', { recipient: email.email });
    } catch (dbError) {
      this.logger.critical('Failed to save notification failure to database', {
        recipient: email.email,
        error: dbError?.message,
        stack: dbError?.stack,
      });
    }
  }
}
