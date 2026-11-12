import { NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import type { LoggerService } from '@app/core';
import { UsersRepository } from './users.repository';
import { User } from '../models';

// Stands in for TypeORM's query builder and records what the repository asks for.
const standInQueryBuilder = (found: User | null) => {
  const selects: string[] = [];
  const conditions: string[] = [];
  const parameters: Record<string, unknown> = {};
  const andWhere = (condition: string, values: object = {}) => {
    conditions.push(condition);
    Object.assign(parameters, values);
    return builder;
  };
  const builder = {
    addSelect: (selection: string) => {
      selects.push(selection);
      return builder;
    },
    // Like TypeORM's, where() replaces the conditions set before it.
    where: (condition: string, values?: object) => {
      conditions.length = 0;
      return andWhere(condition, values);
    },
    andWhere,
    getOne: async () => found,
  };
  return { builder, selects, conditions, parameters };
};

describe('UsersRepository', () => {
  const logger = { setContext: jest.fn(), warn: jest.fn() };

  const repositoryAnswering = (found: User | null) => {
    const query = standInQueryBuilder(found);
    const typeormRepository = { createQueryBuilder: jest.fn(() => query.builder) };
    const repository = new UsersRepository(
      typeormRepository as unknown as Repository<User>,
      logger as unknown as LoggerService,
    );
    return { repository, query };
  };

  describe('findOneWithPassword', () => {
    it('asks only for an active user with that email, with the password hash', async () => {
      const user = Object.assign(new User(), { id: 'user-1', email: 'user@example.com', password: 'hash' });
      const { repository, query } = repositoryAnswering(user);

      await expect(repository.findOneWithPassword('user@example.com')).resolves.toBe(user);

      expect(query.selects).toEqual(['user.password']);
      expect(query.conditions).toEqual(['user.email = :email', 'user.isActive = :isActive']);
      expect(query.parameters).toEqual({ email: 'user@example.com', isActive: true });
    });

    it('answers not found when no active user has that email', async () => {
      const { repository } = repositoryAnswering(null);

      await expect(repository.findOneWithPassword('inactive@example.com')).rejects.toThrow(
        new NotFoundException('Entity not found.'),
      );
    });
  });
});
