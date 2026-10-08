import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { RobotCreateRequest } from '@app/contracts/internal';
import { Funds, Instrument, RobotsRepository } from '@app/postgres';
import { WriteRobotsService } from './write-robots.service';

describe('WriteRobotsService', () => {
  const robotsRepository = { create: jest.fn() };
  const fundsRepo = { create: jest.fn(), save: jest.fn() };
  const instrumentRepo = { create: jest.fn(), save: jest.fn() };
  let service: WriteRobotsService;

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

  beforeEach(async () => {
    jest.resetAllMocks();
    // Stand-ins for TypeORM: create() returns what it was given, save() adds the generated id.
    fundsRepo.create.mockImplementation((data: object) => ({ ...data }));
    fundsRepo.save.mockImplementation((funds: object) => Promise.resolve({ ...funds, id: 'funds-1' }));
    instrumentRepo.create.mockImplementation((data: object) => ({ ...data }));
    instrumentRepo.save.mockImplementation((instrument: object) =>
      Promise.resolve({ ...instrument, id: 'instrument-1' }),
    );
    robotsRepository.create.mockImplementation((robot: object) => Promise.resolve({ ...robot, id: 'robot-1' }));

    const moduleRef = await Test.createTestingModule({
      providers: [
        WriteRobotsService,
        { provide: RobotsRepository, useValue: robotsRepository },
        { provide: getRepositoryToken(Funds), useValue: fundsRepo },
        { provide: getRepositoryToken(Instrument), useValue: instrumentRepo },
      ],
    }).compile();

    service = moduleRef.get(WriteRobotsService);
  });

  it('creates the robot, its funds and its instrument from the fields of the request', async () => {
    await service.create(request);

    expect(fundsRepo.create).toHaveBeenCalledWith(expectedFunds);
    expect(instrumentRepo.create).toHaveBeenCalledWith(expectedInstrument);
    expect(robotsRepository.create).toHaveBeenCalledWith(expectedRobot);
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
    expect(robotsRepository.create).toHaveBeenCalledWith(expectedRobot);
  });
});
