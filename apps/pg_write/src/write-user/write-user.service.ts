import { ConflictException, Injectable } from '@nestjs/common';
import { User, UsersRepository } from '@app/postgres';
import { QueryFailedError } from 'typeorm';

@Injectable()
export class WriteUserService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async create(data: User) {
    try {
      return await this.usersRepository.create(data);
    } catch (err) {
      if (err instanceof QueryFailedError && (err as any).code === '23505') {
        throw new ConflictException('Email is already in use');
      }
      throw err;
    }
  }
}
