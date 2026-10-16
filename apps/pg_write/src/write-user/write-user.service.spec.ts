import { Test } from '@nestjs/testing';
import type { UserCreateRequest } from '@app/contracts/internal';
import { UsersRepository } from '@app/postgres';
import { WriteUserService } from './write-user.service';

const PASSWORD_HASH = '$2b$16$3euPcmQFCiblsZeEu5s7p.9OVHgeHWFDk9nhMqZ0m/3pd/lhwZgES';

describe('WriteUserService', () => {
  const usersRepository = { create: jest.fn() };
  let service: WriteUserService;

  beforeEach(async () => {
    jest.resetAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [WriteUserService, { provide: UsersRepository, useValue: usersRepository }],
    }).compile();

    service = moduleRef.get(WriteUserService);
  });

  const request: UserCreateRequest = {
    email: 'user@example.com',
    password: PASSWORD_HASH,
    notifyByEmail: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    isActive: true,
  };

  const expectedRow = {
    email: 'user@example.com',
    password: PASSWORD_HASH,
    notifyByEmail: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    isActive: true,
  };

  describe('create', () => {
    it('stores the fields of the request and returns the saved user', async () => {
      const saved = { id: 'user-1' };
      usersRepository.create.mockResolvedValue(saved);

      const result = await service.create(request);

      expect(usersRepository.create).toHaveBeenCalledWith(expectedRow);
      expect(result).toBe(saved);
    });

    it('applies no roles or id sent with the request', async () => {
      usersRepository.create.mockResolvedValue({ id: 'user-1' });
      const withExtraFields = { ...request, roles: ['admin'], id: 'chosen-user-id' } as UserCreateRequest;

      await service.create(withExtraFields);

      expect(usersRepository.create).toHaveBeenCalledWith(expectedRow);
    });

    it('stores notifyByEmail and isActive as the request gives them', async () => {
      usersRepository.create.mockResolvedValue({ id: 'user-1' });

      await service.create({ ...request, notifyByEmail: false, isActive: false });

      expect(usersRepository.create).toHaveBeenCalledWith({ ...expectedRow, notifyByEmail: false, isActive: false });
    });
  });
});
