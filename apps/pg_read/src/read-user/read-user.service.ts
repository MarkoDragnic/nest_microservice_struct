import { BadRequestException, Injectable } from '@nestjs/common';
import { UsersRepository } from '@app/postgres';

@Injectable()
export class ReadUserService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async findOne(params: { email?: string; id?: string }) {
    const { id, email } = params ?? {};

    if (typeof id === 'string' && id.length > 0) {
      return this.usersRepository.findOne({ id });
    }
    if (typeof email === 'string' && email.length > 0) {
      return this.usersRepository.findOne({ email });
    }

    throw new BadRequestException('User id or email is required');
  }

  async findOneWithPassword(email: string) {
    return this.usersRepository.findOneWithPassword(email);
  }
}
