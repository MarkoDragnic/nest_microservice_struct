import { type ArgumentsHost, BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { firstValueFrom } from 'rxjs';
import {
  HlRule,
  type IIndicatorsConfig,
  ProfitFactor,
  type RobotCreateDto,
  type RobotIndicatorsUpdateData,
  RsiRule,
  TCP_DB_EVENTS,
} from '@app/contracts';
import { GeneralService, GlobalRpcExceptionFilter } from '@app/core';
import { ClientTcpService, PG_READ_SERVICE, PG_WRITE_SERVICE } from '@app/messaging';
import { IndicatorsRedisRepository } from '@app/redis';
import { RobotIndicatorsService } from './robot-indicators.service';
import { RobotsService } from './robots.service';

describe('RobotsService', () => {
  const pgWriteClient = { name: 'pg_write' };
  const pgReadClient = { name: 'pg_read' };
  const tcpClientService = { send: jest.fn() };
  const indicatorsRedisRepository = { updateIndicatorsUse: jest.fn() };
  let service: RobotsService;

  // Answers each pattern the way pg_read and pg_write do.
  const answerWith = (answers: Record<string, unknown>) =>
    tcpClientService.send.mockImplementation((_client: unknown, pattern: string) => Promise.resolve(answers[pattern]));

  const answerThroughFilter = async (call: Promise<unknown>) => {
    const error: unknown = await call.then(
      () => {
        throw new Error('expected the call to fail');
      },
      (reason: unknown) => reason,
    );
    return firstValueFrom(new GlobalRpcExceptionFilter().catch(error, {} as ArgumentsHost));
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    indicatorsRedisRepository.updateIndicatorsUse.mockResolvedValue(undefined);

    const moduleRef = await Test.createTestingModule({
      providers: [
        RobotsService,
        RobotIndicatorsService,
        GeneralService,
        { provide: IndicatorsRedisRepository, useValue: indicatorsRedisRepository },
        { provide: PG_WRITE_SERVICE, useValue: pgWriteClient },
        { provide: PG_READ_SERVICE, useValue: pgReadClient },
        { provide: ClientTcpService, useValue: tcpClientService },
      ],
    }).compile();

    service = moduleRef.get(RobotsService);
  });

  describe('create', () => {
    const robotBody: RobotCreateDto = {
      name: 'Robot one',
      fsymbol: 'BTCUSDT',
      type: 'test',
      assets: 'BTC',
      active: true,
      accountId: 'account-1',
      funds: { initial: 1000, value: 1000, base: 'USDT', dynamic: false, partial: '5', size: 10 },
      instrument: { name: 'Bitcoin', symbol: 'BTCUSDT' },
    };

    // sha256 over { owner, name, type, account, assets, instrument } for the body above
    const expectedHash = 'cb3fe10059536f31d879a6f803f45f5064b032fd97581584f90c3c9a42f5b3e1';

    const expectedRequest = {
      owner: { id: 'user-1' },
      account: { id: 'account-1' },
      hash: expectedHash,
      name: 'Robot one',
      fsymbol: 'BTCUSDT',
      type: 'test',
      assets: 'BTC',
      active: true,
      funds: { initial: 1000, value: 1000, base: 'USDT', dynamic: false, partial: '5', size: 10 },
      instrument: { name: 'Bitcoin', symbol: 'BTCUSDT' },
    };

    it('asks pg_write to create the robot for the authenticated user and returns its answer', async () => {
      const created = { id: 'robot-1', name: 'Robot one' };
      answerWith({ [TCP_DB_EVENTS.ROBOT_CREATE]: created });

      const result = await service.create({ robot: robotBody, userId: 'user-1' });

      expect(tcpClientService.send).toHaveBeenCalledWith(pgWriteClient, TCP_DB_EVENTS.ROBOT_CREATE, expectedRequest);
      expect(result).toBe(created);
    });

    it('takes the owner and the hash from userId, not from a user field in the message', async () => {
      answerWith({ [TCP_DB_EVENTS.ROBOT_CREATE]: { id: 'robot-1' } });
      const message = { robot: robotBody, user: { id: 'another-user' }, userId: 'user-1' };

      await service.create(message);

      expect(tcpClientService.send).toHaveBeenCalledWith(pgWriteClient, TCP_DB_EVENTS.ROBOT_CREATE, expectedRequest);
    });

    it.each([
      ['missing', undefined],
      ['an empty string', ''],
      ['an object', { id: 'user-1' }],
    ])('refuses a create message whose userId is %s, without falling back to user', async (_case, userId) => {
      const message = { robot: robotBody, user: { id: 'user-1' }, userId: userId as string };

      const attempt = service.create(message);

      await expect(attempt).rejects.toBeInstanceOf(BadRequestException);
      await expect(attempt).rejects.toThrow('User id is required');
      expect(tcpClientService.send).not.toHaveBeenCalled();
    });

    it('takes owner, account and hash only from trusted input, never from extra fields in the body', async () => {
      answerWith({ [TCP_DB_EVENTS.ROBOT_CREATE]: { id: 'robot-1' } });
      const tamperedBody = {
        ...robotBody,
        id: 'chosen-robot-id',
        userId: 'another-user',
        user: { id: 'another-user' },
        ownerId: 'another-user',
        owner: { id: 'another-user' },
        account: { id: 'another-account' },
        hash: 'client-chosen-hash',
        funds: { ...robotBody.funds, id: 'chosen-funds-id', reserved: 999999 },
        instrument: { ...robotBody.instrument, id: 'chosen-instrument-id' },
      } as RobotCreateDto;

      await service.create({ robot: tamperedBody, userId: 'user-1' });

      expect(tcpClientService.send).toHaveBeenCalledWith(pgWriteClient, TCP_DB_EVENTS.ROBOT_CREATE, expectedRequest);
    });
  });

  describe('upsertIndicators', () => {
    const indicators = (rsiPeriod: number): IIndicatorsConfig => ({
      open: {
        rsi: { enabled: true, period: rsiPeriod, rule: RsiRule.LESS, value: 30 },
        hl: { enabled: false, period: 20, rule: HlRule.GREATER, value: 0 },
      },
      close: {
        take_profit: { enabled: true, factor: ProfitFactor.PERCENT, value: 5 },
        stop_lose: { enabled: true, factor: ProfitFactor.PERCENT, value: 2 },
        min_profit: { enabled: false, factor: ProfitFactor.VALUE, value: 0 },
        rsi: { enabled: false, period: 14, rule: RsiRule.GREATER, value: 70 },
        hl: { enabled: false, period: 20, rule: HlRule.LESS, value: 0 },
      },
    });

    it('stores the indicators and registers the changed periods under the symbol of the robot', async () => {
      const updated = { id: 'robot-1' };
      answerWith({
        [TCP_DB_EVENTS.ROBOT_FIND_ONE]: { fsymbol: 'BTCUSDT', indicators: indicators(14), owner: { id: 'user-1' } },
        [TCP_DB_EVENTS.ROBOT_INDICATORS_UPSERT]: updated,
      });
      const next = indicators(21);

      const result = await service.upsertIndicators({
        robotId: 'robot-1',
        userId: 'user-1',
        ...next,
      } as RobotIndicatorsUpdateData);

      expect(tcpClientService.send).toHaveBeenCalledWith(pgReadClient, TCP_DB_EVENTS.ROBOT_FIND_ONE, { id: 'robot-1' });
      expect(tcpClientService.send).toHaveBeenCalledWith(pgWriteClient, TCP_DB_EVENTS.ROBOT_INDICATORS_UPSERT, {
        robotId: 'robot-1',
        ownerId: 'user-1',
        indicators: { open: next.open, close: next.close },
      });
      expect(indicatorsRedisRepository.updateIndicatorsUse).toHaveBeenCalledWith('BTCUSDT', {
        remove: [{ indicator: 'rsi', period: 14 }],
        add: [{ indicator: 'rsi', period: 21 }],
      });
      expect(result).toBe(updated);
    });

    it('names the user who asked as the owner, not the owner of the robot or one named in the body', async () => {
      answerWith({
        [TCP_DB_EVENTS.ROBOT_FIND_ONE]: { fsymbol: 'BTCUSDT', indicators: indicators(14), owner: { id: 'user-2' } },
        [TCP_DB_EVENTS.ROBOT_INDICATORS_UPSERT]: { id: 'robot-of-another-user' },
      });
      const next = indicators(21);
      const withExtraFields = {
        robotId: 'robot-of-another-user',
        userId: 'user-1',
        ownerId: 'user-2',
        owner: { id: 'user-2' },
        ...next,
      } as RobotIndicatorsUpdateData;

      await service.upsertIndicators(withExtraFields);

      expect(tcpClientService.send).toHaveBeenCalledWith(pgWriteClient, TCP_DB_EVENTS.ROBOT_INDICATORS_UPSERT, {
        robotId: 'robot-of-another-user',
        ownerId: 'user-1',
        indicators: { open: next.open, close: next.close },
      });
    });

    it('leaves the indicator registry alone when pg_write refuses the update', async () => {
      const refusal = new Error('Robot not found');
      tcpClientService.send.mockImplementation((_client: unknown, pattern: string) =>
        pattern === TCP_DB_EVENTS.ROBOT_INDICATORS_UPSERT
          ? Promise.reject(refusal)
          : Promise.resolve({ fsymbol: 'BTCUSDT', indicators: indicators(14), owner: { id: 'user-2' } }),
      );

      const update = service.upsertIndicators({
        robotId: 'robot-of-another-user',
        userId: 'user-1',
        ...indicators(21),
      } as RobotIndicatorsUpdateData);

      await expect(update).rejects.toBe(refusal);
      expect(indicatorsRedisRepository.updateIndicatorsUse).not.toHaveBeenCalled();
    });

    it('answers 404 for a robot that does not exist, without asking pg_write', async () => {
      answerWith({});

      const answer = await answerThroughFilter(
        service.upsertIndicators({
          robotId: 'missing-robot',
          userId: 'user-1',
          ...indicators(21),
        } as RobotIndicatorsUpdateData),
      );

      expect(answer).toMatchObject({ error: true, statusCode: 404, message: 'Robot not found', data: null });
      expect(tcpClientService.send).not.toHaveBeenCalledWith(
        pgWriteClient,
        TCP_DB_EVENTS.ROBOT_INDICATORS_UPSERT,
        expect.anything(),
      );
    });
  });

  describe('getOwner', () => {
    it('returns the owner id of the robot', async () => {
      answerWith({ [TCP_DB_EVENTS.ROBOT_FIND_ONE]: { fsymbol: 'BTCUSDT', owner: { id: 'user-1' } } });

      await expect(service.getOwner('robot-1')).resolves.toBe('user-1');
      expect(tcpClientService.send).toHaveBeenCalledWith(pgReadClient, TCP_DB_EVENTS.ROBOT_FIND_ONE, { id: 'robot-1' });
    });

    it('answers 404 for a robot that does not exist', async () => {
      answerWith({});

      const answer = await answerThroughFilter(service.getOwner('missing-robot'));

      expect(answer).toMatchObject({ error: true, statusCode: 404, message: 'Robot not found', data: null });
    });
  });
});
