import { Test } from '@nestjs/testing';
import { ClosePositionDto, NotificationTypes, OpenPositionDto, TCP_DB_EVENTS } from '@app/contracts';
import { ClientTcpService, PG_READ_SERVICE, PG_WRITE_SERVICE } from '@app/messaging';
import { PositionNotificationService } from './position-notification.service';
import { PositionsService } from './positions.service';

describe('PositionsService', () => {
  const pgWriteClient = { name: 'pg_write' };
  const pgReadClient = { name: 'pg_read' };
  const tcpClientService = { send: jest.fn() };
  const notificationService = { sendNotification: jest.fn() };
  let service: PositionsService;

  const notificationTarget = { name: 'Robot one', owner: { email: 'owner@example.com', notifyByEmail: true } };
  const openedPosition = {
    id: 'position-1',
    symbol: 'BTCUSDT',
    entryPrice: 50000,
    quantity: 0.01,
    openedAt: '2026-01-05T00:00:00.000Z',
    closePrice: null,
    closedAt: null,
    transaction: 500,
  };

  // Answers each pattern the way pg_read and pg_write do.
  const answerWith = (answers: Record<string, unknown>) =>
    tcpClientService.send.mockImplementation((_client: unknown, pattern: string) => Promise.resolve(answers[pattern]));

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        PositionsService,
        { provide: PG_WRITE_SERVICE, useValue: pgWriteClient },
        { provide: PG_READ_SERVICE, useValue: pgReadClient },
        { provide: ClientTcpService, useValue: tcpClientService },
        { provide: PositionNotificationService, useValue: notificationService },
      ],
    }).compile();

    service = moduleRef.get(PositionsService);
  });

  describe('create', () => {
    it('asks pg_read for the notification target, not the whole robot', async () => {
      answerWith({
        [TCP_DB_EVENTS.POSITION_OPEN_TRANSACTIONAL]: openedPosition,
        [TCP_DB_EVENTS.ROBOT_FIND_NOTIFICATION_TARGET]: notificationTarget,
      });

      await service.create({ robotId: 'robot-1' } as OpenPositionDto);

      expect(tcpClientService.send).toHaveBeenCalledWith(pgReadClient, TCP_DB_EVENTS.ROBOT_FIND_NOTIFICATION_TARGET, {
        id: 'robot-1',
      });
      expect(tcpClientService.send).not.toHaveBeenCalledWith(
        expect.anything(),
        TCP_DB_EVENTS.ROBOT_FIND_ONE,
        expect.anything(),
      );
    });

    it('emits the open notification with only the email and notifyByEmail of the owner', async () => {
      answerWith({
        [TCP_DB_EVENTS.POSITION_OPEN_TRANSACTIONAL]: openedPosition,
        [TCP_DB_EVENTS.ROBOT_FIND_NOTIFICATION_TARGET]: notificationTarget,
      });

      await service.create({ robotId: 'robot-1' } as OpenPositionDto);

      expect(notificationService.sendNotification).toHaveBeenCalledTimes(1);
      expect(notificationService.sendNotification).toHaveBeenCalledWith({
        type: NotificationTypes.POSITION_OPEN,
        data: {
          user: { email: 'owner@example.com', notifyByEmail: true },
          positionId: 'position-1',
          symbol: 'BTCUSDT',
          entryPrice: 50000,
          quantity: 0.01,
          openedAt: '2026-01-05T00:00:00.000Z',
          robotName: 'Robot one',
        },
      });
    });
  });

  describe('close', () => {
    it('emits the close notification with only the email and notifyByEmail of the owner', async () => {
      answerWith({
        [TCP_DB_EVENTS.POSITION_CLOSE_TRANSACTIONAL]: {
          ...openedPosition,
          closePrice: 51000,
          closedAt: '2026-01-06T07:08:09.000Z',
          transaction: 10,
        },
        [TCP_DB_EVENTS.POSITION_FIND_ONE]: { robot: notificationTarget },
      });

      await service.close({ positionId: 'position-1' } as ClosePositionDto);

      expect(tcpClientService.send).toHaveBeenCalledWith(pgReadClient, TCP_DB_EVENTS.POSITION_FIND_ONE, {
        id: 'position-1',
      });
      expect(notificationService.sendNotification).toHaveBeenCalledWith({
        type: NotificationTypes.POSITION_CLOSE,
        data: {
          user: { email: 'owner@example.com', notifyByEmail: true },
          positionId: 'position-1',
          symbol: 'BTCUSDT',
          entryPrice: 50000,
          closePrice: 51000,
          quantity: 0.01,
          openedAt: '2026-01-05T00:00:00.000Z',
          closedAt: '2026-01-06T07:08:09.000Z',
          robotName: 'Robot one',
          profit: 10,
        },
      });
    });
  });
});
