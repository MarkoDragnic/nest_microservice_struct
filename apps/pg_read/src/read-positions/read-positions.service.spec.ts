import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PaginatedResponseDto } from '@app/contracts';
import { PositionsRepository } from '@app/postgres';
import { ReadPositionsService } from './read-positions.service';

describe('ReadPositionsService', () => {
  const positionsRepository = { findPaginated: jest.fn() };
  let service: ReadPositionsService;

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [ReadPositionsService, { provide: PositionsRepository, useValue: positionsRepository }],
    }).compile();

    service = moduleRef.get(ReadPositionsService);
  });

  describe('findPaginated', () => {
    it('lists the positions of the robots owned by the user it is asked for', async () => {
      const page = new PaginatedResponseDto([{ id: 'position-1' }], 1, 2, 50);
      positionsRepository.findPaginated.mockResolvedValue(page);

      const result = await service.findPaginated('user-1', 2, 50);

      expect(positionsRepository.findPaginated).toHaveBeenCalledWith({ robot: { owner: { id: 'user-1' } } }, 2, 50, {
        robot: true,
      });
      expect(result).toBe(page);
    });

    // TypeORM drops a condition whose value is undefined or null: the list would hold every user's positions.
    it.each([
      ['missing', undefined],
      ['null', null],
      ['an empty string', ''],
      ['an empty object', {}],
    ])('refuses a user id that is %s, and asks the database nothing', async (_case, userId) => {
      await expect(service.findPaginated(userId as string, 1, 20)).rejects.toThrow(
        new BadRequestException('User id is required'),
      );

      expect(positionsRepository.findPaginated).not.toHaveBeenCalled();
    });
  });
});
