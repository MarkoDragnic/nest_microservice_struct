import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { ConfigService } from '@nestjs/config';
import { NotificationsController } from './notifications.controller';
import { NotificationsTemplateService } from './notifications-template.service';
import { NOTIFICATION_QUEUE } from './types/queue.types';
import { LoggerService } from '@app/common/logger';
import { KafkaDlqService } from '@app/common';

describe('NotificationsController', () => {
  let notificationsController: NotificationsController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        { provide: getQueueToken(NOTIFICATION_QUEUE), useValue: { add: jest.fn() } },
        { provide: NotificationsTemplateService, useValue: { getMailTemplate: jest.fn() } },
        { provide: LoggerService, useValue: { setContext: jest.fn(), log: jest.fn(), error: jest.fn() } },
        { provide: KafkaDlqService, useValue: { publish: jest.fn() } },
        {
          provide: ConfigService,
          useValue: { get: jest.fn((_: string, defaultValue?: unknown) => defaultValue) },
        },
      ],
    }).compile();

    notificationsController = app.get<NotificationsController>(NotificationsController);
  });

  it('should be defined', () => {
    expect(notificationsController).toBeDefined();
  });
});
