import { BadRequestException } from '@nestjs/common';
import { UsersRepository } from '@app/postgres';
import { ReadUserService } from './read-user.service';

describe('ReadUserService', () => {
  let usersRepository: { findOne: jest.Mock };
  let service: ReadUserService;

  beforeEach(() => {
    usersRepository = { findOne: jest.fn().mockResolvedValue({ id: 'user-1' }) };
    service = new ReadUserService(usersRepository as unknown as UsersRepository);
  });

  describe('findOne', () => {
    it('looks the user up by id only, without extra fields from params', async () => {
      const params = { id: 'user-1', correlationId: 'b0a1c2d3-0000-4000-8000-000000000001', isActive: false };

      await service.findOne(params);

      expect(usersRepository.findOne).toHaveBeenCalledTimes(1);
      expect(usersRepository.findOne).toHaveBeenCalledWith({ id: 'user-1' });
    });

    it('looks the user up by email only, without extra fields from params', async () => {
      const params = { email: 'user@example.com', correlationId: 'b0a1c2d3-0000-4000-8000-000000000001' };

      await service.findOne(params);

      expect(usersRepository.findOne).toHaveBeenCalledTimes(1);
      expect(usersRepository.findOne).toHaveBeenCalledWith({ email: 'user@example.com' });
    });

    it('prefers id when both id and email are given', async () => {
      await service.findOne({ id: 'user-1', email: 'user@example.com' });

      expect(usersRepository.findOne).toHaveBeenCalledWith({ id: 'user-1' });
    });

    it('falls back to email when id is an empty string', async () => {
      await service.findOne({ id: '', email: 'user@example.com' });

      expect(usersRepository.findOne).toHaveBeenCalledWith({ email: 'user@example.com' });
    });

    it.each([
      ['{ id: undefined }', { id: undefined }],
      ['{}', {}],
      ['empty strings', { id: '', email: '' }],
      ['non-string values', { id: 1, email: { $ne: null } }],
    ])('refuses %s and does not call the repository', async (_name, params) => {
      await expect(service.findOne(params as { id?: string; email?: string })).rejects.toThrow(BadRequestException);

      expect(usersRepository.findOne).not.toHaveBeenCalled();
    });
  });
});
