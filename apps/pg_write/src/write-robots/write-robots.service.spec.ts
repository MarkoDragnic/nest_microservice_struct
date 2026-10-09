import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import type { RobotCreateRequest } from '@app/contracts/internal';
import { Account, Funds, Instrument, Robot, RobotsRepository } from '@app/postgres';
import { WriteRobotsService } from './write-robots.service';

describe('WriteRobotsService', () => {
  const robotsRepository = { findOne: jest.fn() };
  const accountRepo = { findOne: jest.fn() };
  const fundsRepo = { create: jest.fn(), save: jest.fn() };
  const instrumentRepo = { create: jest.fn(), save: jest.fn() };
  const robotRepo = { create: jest.fn(), save: jest.fn() };
  const dataSource = { transaction: jest.fn() };
  let service: WriteRobotsService;

  // The repositories of the transaction. Everything the service writes goes through them.
  const repositories = new Map<unknown, object>([
    [Account, accountRepo],
    [Funds, fundsRepo],
    [Instrument, instrumentRepo],
    [Robot, robotRepo],
  ]);
  const manager = { getRepository: (entity: unknown) => repositories.get(entity) };

  const accounts = [
    { id: 'account-1', userId: 'user-1' },
    { id: 'account-of-another-user', userId: 'user-2' },
  ];

  // Finds an account the way TypeORM does: a condition whose value is undefined or null is dropped,
  // not matched, so a lookup with a missing owner id would find the account by its id alone.
  const findAccount = ({ where }: { where: Record<string, unknown> }) => {
    const conditions = Object.entries(where).filter(([, value]) => value !== undefined && value !== null);
    const account = accounts.find((row) => conditions.every(([key, value]) => row[key as keyof typeof row] === value));
    return Promise.resolve(account ?? null);
  };

  const request: RobotCreateRequest = {
    owner: { id: 'user-1' },
    account: { id: 'account-1' },
    hash: 'hash-from-robots',
    name: 'Robot one',
    fsymbol: 'BTCUSDT',
    type: 'test',
    assets: 'BTC',
    active: true,
    funds: { initial: 1000, value: 1000, base: 'USDT', dynamic: false, partial: '5', size: 10 },
    instrument: { name: 'Bitcoin', symbol: 'BTCUSDT' },
  };

  const expectedFunds = { initial: 1000, value: 1000, base: 'USDT', dynamic: false, partial: '5', size: 10 };
  const expectedInstrument = { name: 'Bitcoin', symbol: 'BTCUSDT' };
  const expectedRobot = {
    owner: { id: 'user-1' },
    account: { id: 'account-1' },
    hash: 'hash-from-robots',
    name: 'Robot one',
    fsymbol: 'BTCUSDT',
    type: 'test',
    assets: 'BTC',
    active: true,
    funds: { ...expectedFunds, id: 'funds-1' },
    instrument: { ...expectedInstrument, id: 'instrument-1' },
  };

  const expectNothingCreated = () => {
    expect(fundsRepo.save).not.toHaveBeenCalled();
    expect(instrumentRepo.save).not.toHaveBeenCalled();
    expect(robotRepo.save).not.toHaveBeenCalled();
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    dataSource.transaction.mockImplementation((work: (transaction: typeof manager) => unknown) => work(manager));
    accountRepo.findOne.mockImplementation(findAccount);
    // Stand-ins for TypeORM: create() returns what it was given, save() adds the generated id.
    fundsRepo.create.mockImplementation((data: object) => ({ ...data }));
    fundsRepo.save.mockImplementation((funds: object) => Promise.resolve({ ...funds, id: 'funds-1' }));
    instrumentRepo.create.mockImplementation((data: object) => ({ ...data }));
    instrumentRepo.save.mockImplementation((instrument: object) =>
      Promise.resolve({ ...instrument, id: 'instrument-1' }),
    );
    robotRepo.create.mockImplementation((robot: object) => ({ ...robot }));
    robotRepo.save.mockImplementation((robot: object) => Promise.resolve({ ...robot, id: 'robot-1' }));

    const moduleRef = await Test.createTestingModule({
      providers: [
        WriteRobotsService,
        { provide: RobotsRepository, useValue: robotsRepository },
        { provide: getDataSourceToken(), useValue: dataSource },
      ],
    }).compile();

    service = moduleRef.get(WriteRobotsService);
  });

  it('creates the robot, its funds and its instrument from the fields of the request, in one transaction', async () => {
    await service.create(request);

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(fundsRepo.create).toHaveBeenCalledWith(expectedFunds);
    expect(instrumentRepo.create).toHaveBeenCalledWith(expectedInstrument);
    expect(robotRepo.create).toHaveBeenCalledWith(expectedRobot);
    expect(robotRepo.save).toHaveBeenCalledTimes(1);
  });

  // save() hands back only the ids of the owner and the account it was given. The answer needs the
  // account's exchange and environment, so the robot is read back with its relations.
  it('answers create with the robot read back from the database, not the instance it saved', async () => {
    const readBack = { id: 'robot-1', account: { id: 'account-1', exchange: 'binance', environment: 'sandbox' } };
    robotsRepository.findOne.mockResolvedValue(readBack);

    const created = await service.create(request);

    expect(robotsRepository.findOne).toHaveBeenCalledWith({ id: 'robot-1' });
    expect(created).toBe(readBack);
  });

  it('applies none of the extra fields in a payload', async () => {
    const payload = {
      ...request,
      id: 'chosen-robot-id',
      ownerId: 'another-user',
      owner: { id: 'user-1', roles: ['admin'] },
      account: { id: 'account-1', userId: 'another-user' },
      indicators: { open: {}, close: {} },
      createdAt: '2020-01-01T00:00:00.000Z',
      funds: { ...request.funds, id: 'chosen-funds-id', reserved: 999999 },
      instrument: { ...request.instrument, id: 'chosen-instrument-id' },
    } as RobotCreateRequest;

    await service.create(payload);

    expect(fundsRepo.create).toHaveBeenCalledWith(expectedFunds);
    expect(instrumentRepo.create).toHaveBeenCalledWith(expectedInstrument);
    expect(robotRepo.create).toHaveBeenCalledWith(expectedRobot);
  });

  describe('the account of a new robot must belong to its owner', () => {
    it('looks the account up by its id and the owner together', async () => {
      await service.create(request);

      expect(accountRepo.findOne).toHaveBeenCalledWith({ where: { id: 'account-1', userId: 'user-1' } });
    });

    it('refuses a robot on the account of another user, and creates nothing', async () => {
      const onAnotherUsersAccount = { ...request, account: { id: 'account-of-another-user' } };

      await expect(service.create(onAnotherUsersAccount)).rejects.toThrow(new NotFoundException('Account not found'));

      expectNothingCreated();
    });

    it('answers the account of another user exactly as it answers an account that does not exist', async () => {
      const refusal = (accountId: string) =>
        service.create({ ...request, account: { id: accountId } }).catch((error: NotFoundException) => ({
          status: error.getStatus(),
          body: error.getResponse(),
        }));

      const foreign = await refusal('account-of-another-user');
      const missing = await refusal('account-that-does-not-exist');

      expect(foreign).toEqual({ status: 404, body: expect.objectContaining({ message: 'Account not found' }) });
      expect(missing).toEqual(foreign);
    });

    it.each([
      ['the owner id', { owner: { id: undefined } }],
      ['the owner id, sent as null', { owner: { id: null } }],
      ['the account id', { account: { id: undefined } }],
      ['the account id, sent as an empty string', { account: { id: '' } }],
    ])('refuses a request without %s rather than looking the account up by half the key', async (_case, missing) => {
      const incomplete = { ...request, ...missing } as unknown as RobotCreateRequest;

      await expect(service.create(incomplete)).rejects.toThrow(new NotFoundException('Account not found'));

      expectNothingCreated();
    });
  });
});
