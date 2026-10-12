import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PaginatedResponseDto } from '@app/contracts';
import { RobotsRepository } from '@app/postgres';
import { ReadRobotsService } from './read-robots.service';

describe('ReadRobotsService', () => {
  const robotsRepository = { findPaginated: jest.fn() };
  let service: ReadRobotsService;

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [ReadRobotsService, { provide: RobotsRepository, useValue: robotsRepository }],
    }).compile();

    service = moduleRef.get(ReadRobotsService);
  });

  describe('findPaginated', () => {
    it('lists the robots owned by the user it is asked for', async () => {
      const page = new PaginatedResponseDto([{ id: 'robot-1' }], 1, 2, 50);
      robotsRepository.findPaginated.mockResolvedValue(page);

      const result = await service.findPaginated('user-1', 2, 50);

      expect(robotsRepository.findPaginated).toHaveBeenCalledWith({ owner: { id: 'user-1' } }, 2, 50, {
        instrument: true,
        funds: true,
      });
      expect(result).toBe(page);
    });

    // TypeORM drops a condition whose value is undefined or null: the list would hold every user's robots.
    it.each([
      ['missing', undefined],
      ['null', null],
      ['an empty string', ''],
      ['an empty object', {}],
    ])('refuses a user id that is %s, and asks the database nothing', async (_case, userId) => {
      await expect(service.findPaginated(userId as string, 1, 20)).rejects.toThrow(
        new BadRequestException('User id is required'),
      );

      expect(robotsRepository.findPaginated).not.toHaveBeenCalled();
    });
  });
});
