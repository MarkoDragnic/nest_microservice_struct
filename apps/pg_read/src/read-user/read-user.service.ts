import { Injectable } from '@nestjs/common';
import { UsersRepository } from '@app/common';

@Injectable()
export class ReadUserService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async findOne(params: { email?: string; id?: string }) {
    return this.usersRepository.findOne(params);
  }

  async findOneWithPassword(email: string) {
    return this.usersRepository.findOneWithPassword(email);
  }
}
