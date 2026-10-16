import { ConflictException, Injectable } from '@nestjs/common';
import type { UserCreateRequest } from '@app/contracts/internal';
import { UsersRepository } from '@app/postgres';
import { QueryFailedError } from 'typeorm';

@Injectable()
export class WriteUserService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async create(request: UserCreateRequest) {
    try {
      return await this.usersRepository.create({
        email: request.email,
        password: request.password,
        notifyByEmail: request.notifyByEmail,
        createdAt: new Date(request.createdAt),
        updatedAt: new Date(request.updatedAt),
        isActive: request.isActive,
      });
    } catch (err) {
      if (err instanceof QueryFailedError && (err as any).code === '23505') {
        throw new ConflictException('Email is already in use');
      }
      throw err;
    }
  }
}
