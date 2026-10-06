import { Test, TestingModule } from '@nestjs/testing';
import { InternalRpcGuard, SerializerService } from '@app/core';
import { Robot } from '@app/postgres';
import { ReadRobotsController } from './read-robots.controller';
import { ReadRobotsService } from './read-robots.service';

describe('ReadRobotsController', () => {
  let controller: ReadRobotsController;
  const readRobotsService = { findAllActiveBySymbol: jest.fn() };

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
});
