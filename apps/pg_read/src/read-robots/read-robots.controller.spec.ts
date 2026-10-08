import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { InternalRpcGuard, SerializerService } from '@app/core';
import { Robot, User } from '@app/postgres';
import { ReadRobotsController } from './read-robots.controller';
import { ReadRobotsService } from './read-robots.service';

describe('ReadRobotsController', () => {
  let controller: ReadRobotsController;
  const readRobotsService = { findAllActiveBySymbol: jest.fn(), findOne: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReadRobotsController],
      providers: [{ provide: ReadRobotsService, useValue: readRobotsService }, SerializerService],
    })
      .overrideGuard(InternalRpcGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ReadRobotsController>(ReadRobotsController);
  });

  it('answers find-all-by-symbol with trading robots, not entities', async () => {
    const robot = Object.assign(new Robot(), {
      id: 'robot-1',
      name: 'Robot one',
      hash: 'robot-hash',
      account: null,
      funds: null,
    });
    readRobotsService.findAllActiveBySymbol.mockResolvedValue([robot]);

    const response = await controller.findAllBySymbol('BTCUSDT');

    expect(readRobotsService.findAllActiveBySymbol).toHaveBeenCalledWith('BTCUSDT');
    expect(response.data).toEqual([{ id: 'robot-1', account: null, funds: null, indicators: undefined }]);
    expect(Object.keys(response.data[0]).sort()).toEqual(['account', 'funds', 'id', 'indicators']);
  });

  describe('find-one', () => {
    it('answers with the symbol, the indicators and the owner id only', async () => {
      const robot = Object.assign(new Robot(), {
        id: 'robot-1',
        name: 'Robot one',
        hash: 'robot-hash',
        fsymbol: 'BTCUSDT',
        indicators: undefined,
        owner: Object.assign(new User(), { id: 'user-1', email: 'owner@example.com', notifyByEmail: true }),
      });
      readRobotsService.findOne.mockResolvedValue(robot);

      const response = await controller.findOne({ id: 'robot-1' });

      expect(readRobotsService.findOne).toHaveBeenCalledWith('robot-1');
      expect(response.data).toEqual({ fsymbol: 'BTCUSDT', indicators: undefined, owner: { id: 'user-1' } });
      expect(JSON.stringify(response.data)).not.toContain('owner@example.com');
    });

    it('rejects when the robot does not exist', async () => {
      readRobotsService.findOne.mockResolvedValue(null);

      await expect(controller.findOne({ id: 'missing' })).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('find-notification-target', () => {
    it('answers with the robot name and the owner contact fields only', async () => {
      const robot = Object.assign(new Robot(), {
        id: 'robot-1',
        name: 'Robot one',
        hash: 'robot-hash',
        fsymbol: 'BTCUSDT',
        owner: Object.assign(new User(), {
          id: 'user-1',
          email: 'owner@example.com',
          notifyByEmail: true,
          roles: ['user'],
        }),
      });
      readRobotsService.findOne.mockResolvedValue(robot);

      const response = await controller.findNotificationTarget({ id: 'robot-1' });

      expect(readRobotsService.findOne).toHaveBeenCalledWith('robot-1');
      expect(response.data).toEqual({ name: 'Robot one', owner: { email: 'owner@example.com', notifyByEmail: true } });
    });

    it('rejects when the robot does not exist', async () => {
      readRobotsService.findOne.mockResolvedValue(null);

      await expect(controller.findNotificationTarget({ id: 'missing' })).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
