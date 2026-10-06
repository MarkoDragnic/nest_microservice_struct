import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ReadPositionsController } from './read-positions.controller';
import { ReadPositionsService } from './read-positions.service';
import { InternalRpcGuard } from '@app/core';
import { Account, Position, Robot, User } from '@app/postgres';

describe('ReadPositionsController', () => {
  let controller: ReadPositionsController;
  const readPositionsService = { findOpenForRobots: jest.fn(), findOne: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReadPositionsController],
      providers: [{ provide: ReadPositionsService, useValue: readPositionsService }],
    })
      .overrideGuard(InternalRpcGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ReadPositionsController>(ReadPositionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('find-one', () => {
    it('answers with the notification target of the position robot, not the entity', async () => {
      const position = Object.assign(new Position(), {
        id: 'position-1',
        symbol: 'BTCUSDT',
        robot: Object.assign(new Robot(), {
          id: 'robot-1',
          name: 'Robot one',
          hash: 'robot-hash',
          owner: Object.assign(new User(), { id: 'user-1', email: 'owner@example.com', notifyByEmail: false }),
          account: Object.assign(new Account(), {
            id: 'account-1',
            apiKeyEncrypted: { iv: 'iv', content: 'api-key', tag: 'tag' },
          }),
        }),
      });
      readPositionsService.findOne.mockResolvedValue(position);

      const response = await controller.findOne({ id: 'position-1' });

      expect(readPositionsService.findOne).toHaveBeenCalledWith('position-1');
      expect(response.data).toEqual({
        robot: { name: 'Robot one', owner: { email: 'owner@example.com', notifyByEmail: false } },
      });
      expect(JSON.stringify(response.data)).not.toContain('api-key');
    });

    it('rejects when the position does not exist', async () => {
      readPositionsService.findOne.mockResolvedValue(null);

      await expect(controller.findOne({ id: 'missing' })).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  it('answers open-for-robots with trading positions, not entities', async () => {
    const position = Object.assign(new Position(), {
      id: 'position-1',
      robot: Object.assign(new Robot(), { id: 'robot-1', name: 'Robot one', hash: 'robot-hash' }),
      symbol: 'BTCUSDT',
      quantity: 0.01,
      entryPrice: 50000,
      transaction: 500,
    });
    readPositionsService.findOpenForRobots.mockResolvedValue([position]);

    const response = await controller.findOpenForRobot({ robotIds: ['robot-1'], symbol: 'BTCUSDT' });

    expect(response.data).toEqual([
      {
        id: 'position-1',
        robot: { id: 'robot-1' },
        symbol: 'BTCUSDT',
        quantity: 0.01,
        entryPrice: 50000,
        rules: undefined,
      },
    ]);
    expect(Object.keys(response.data[0].robot)).toEqual(['id']);
  });
});
