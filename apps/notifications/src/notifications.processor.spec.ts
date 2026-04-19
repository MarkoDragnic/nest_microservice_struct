import { NotificationChannel } from './types/notification.types';
import { NotificationsProcessor } from './notifications.processor';

describe('NotificationsProcessor', () => {
  let notificationsService: { sendEmailNotification: jest.Mock };
  let failedNotificationRepository: { create: jest.Mock };
  let logger: {
    setContext: jest.Mock;
    log: jest.Mock;
    warn: jest.Mock;
    error: jest.Mock;
    notice: jest.Mock;
    critical: jest.Mock;
  };
  let processor: NotificationsProcessor;

  const jobData = {
    channel: NotificationChannel.EMAIL,
    notificationType: 'position.open',
    email: {
      email: 'user@example.com',
      subject: 'subject',
      text: 'text',
    },
    originalPayload: { id: 'event-1' },
  };

  beforeEach(() => {
    notificationsService = { sendEmailNotification: jest.fn() };
    failedNotificationRepository = { create: jest.fn() };
    logger = {
      setContext: jest.fn(),
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      notice: jest.fn(),
      critical: jest.fn(),
    };

    processor = new NotificationsProcessor(
      notificationsService as any,
      failedNotificationRepository as any,
      logger as any,
    );
  });

  describe('handleFailedJob', () => {
    it('leaves retryable failures in Bull without persisting them', async () => {
      const job = {
        id: 'job-1',
        attemptsMade: 2,
        opts: { attempts: 5 },
        data: jobData,
      } as any;

      await processor.handleFailedJob(job, new Error('smtp temporary failure'));

      expect(failedNotificationRepository.create).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith('Email job failed and will be retried', {
        jobId: 'job-1',
        attempts: 2,
        maxAttempts: 5,
        recipient: 'user@example.com',
        error: 'smtp temporary failure',
      });
    });

    it('stores the failure once the last retry has been used', async () => {
      const job = {
        id: 'job-2',
        attemptsMade: 5,
        opts: { attempts: 5 },
        data: jobData,
      } as any;
      const error = new Error('smtp permanent failure');

      await processor.handleFailedJob(job, error);

      expect(failedNotificationRepository.create).toHaveBeenCalledWith({
        channel: NotificationChannel.EMAIL,
        notificationType: 'position.open',
        recipient: 'user@example.com',
        metadata: {
          subject: 'subject',
          text: 'text',
        },
        attemptsMade: 5,
        originalPayload: { id: 'event-1' },
        errorMessage: 'smtp permanent failure',
        errorStack: error.stack,
      });
      expect(logger.notice).toHaveBeenCalledWith('Failed notification saved for manual review', {
        recipient: 'user@example.com',
      });
    });
  });

  describe('handleSendMailJob', () => {
    it('rethrows delivery failures so Bull can retry the job', async () => {
      const job = {
        attemptsMade: 0,
        opts: { attempts: 5 },
        data: jobData,
      } as any;
      const error = new Error('send failed');
      notificationsService.sendEmailNotification.mockRejectedValue(error);

      await expect(processor.handleSendMailJob(job)).rejects.toThrow('send failed');
      expect(logger.error).toHaveBeenCalledWith('Failed to send email', {
        recipient: 'user@example.com',
        attempt: 1,
        error: 'send failed',
        stack: error.stack,
      });
    });
  });
});