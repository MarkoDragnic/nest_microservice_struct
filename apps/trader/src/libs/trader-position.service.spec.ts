import { ConfigService } from '@nestjs/config';
import { RpcException } from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import { of } from 'rxjs';
import { type ICandleWithIndicators, TCP_EVENTS } from '@app/contracts';
import type { TradingPosition, TradingRobot } from '@app/contracts/internal';
import { LoggerService } from '@app/core';
import { ClientTcpService, POSITION_SERVICE } from '@app/messaging';
import { TraderPositionService } from './trader-position.service';

describe('TraderPositionService', () => {
  const positionClient = { send: jest.fn() };
  let service: TraderPositionService;
  let tcpClientService: ClientTcpService;

  const candle = { symbol: 'BTCUSDT', close: 50000 } as ICandleWithIndicators;
  const robot: TradingRobot = { id: 'robot-1', account: null, funds: null };
  const position: TradingPosition = {
    id: 'position-1',
    robot: { id: 'robot-1' },
    symbol: 'BTCUSDT',
    quantity: 0.01,
    entryPrice: 50000,
  };

  // What positions answers on success: the tcpOk envelope with no data.
  const acknowledgement = (message: string) => ({ error: false, message, data: null });

  beforeEach(async () => {
    jest.resetAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        TraderPositionService,
        // The real client service: these tests are about how trader's call resolves.
        ClientTcpService,
        { provide: POSITION_SERVICE, useValue: positionClient },
        { provide: LoggerService, useValue: { setContext: jest.fn(), warn: jest.fn() } },
        { provide: ConfigService, useValue: { getOrThrow: () => 'internal-rpc-token-0123', get: () => undefined } },
      ],
    }).compile();

    service = moduleRef.get(TraderPositionService);
    tcpClientService = moduleRef.get(ClientTcpService);
  });

  it('resolves with the acknowledgement when positions has opened the position', async () => {
    positionClient.send.mockReturnValue(of(acknowledgement('Position created')));
    const send = jest.spyOn(tcpClientService, 'send');

    await expect(service.openPosition(robot, candle, 0.01)).resolves.toBeUndefined();

    await expect(send.mock.results[0].value).resolves.toEqual(acknowledgement('Position created'));
    expect(positionClient.send).toHaveBeenCalledWith(
      TCP_EVENTS.POSITION_OPEN,
      expect.objectContaining({ payload: expect.objectContaining({ robotId: 'robot-1', quantity: 0.01 }) }),
    );
  });

  it('resolves with the acknowledgement when positions has closed the position', async () => {
    positionClient.send.mockReturnValue(of(acknowledgement('Position closed')));
    const send = jest.spyOn(tcpClientService, 'send');

    await expect(service.closePosition(position, candle)).resolves.toBeUndefined();

    await expect(send.mock.results[0].value).resolves.toEqual(acknowledgement('Position closed'));
    expect(positionClient.send).toHaveBeenCalledWith(
      TCP_EVENTS.POSITION_CLOSE,
      expect.objectContaining({ payload: expect.objectContaining({ positionId: 'position-1' }) }),
    );
  });

  it('rejects with an RpcException when positions answers with an error', async () => {
    positionClient.send.mockReturnValue(of({ error: true, statusCode: 409, message: 'Position is already closed' }));

    await expect(service.closePosition(position, candle)).rejects.toBeInstanceOf(RpcException);
  });
});
