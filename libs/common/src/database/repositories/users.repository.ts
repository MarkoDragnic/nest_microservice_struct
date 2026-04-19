import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PostgresqlAbstractRepository } from '@app/common/database';
import { User } from '@app/common/models';
import { LoggerService } from '@app/common/logger';

@Injectable()
export class UsersRepository extends PostgresqlAbstractRepository<User> {
  constructor(
    @InjectRepository(User) userRepository: Repository<User>,
    protected readonly logger: LoggerService,
  ) {
    super(userRepository);
    this.logger.setContext(UsersRepository.name);
  }

  async findOneWithPassword(email: string): Promise<User> {
    const user = await this.repository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();

    if (!user) {
      this.logger.warn('User not found', { email });
      throw new NotFoundException('Entity not found.');
    }
    return user;
  }
}
