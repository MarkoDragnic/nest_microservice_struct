import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { TCP_DB_EVENTS, UserCreateDto, UserCredentialsResponseDto, UserResponseDto } from '@app/contracts';
import { LoggerService } from '@app/core';
import { PG_READ_SERVICE, PG_WRITE_SERVICE, ClientTcpService } from '@app/messaging';
import { User } from '@app/postgres';
import bcryptjs from 'bcryptjs';
import { GetUserDto } from './dto/get-user.dto';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class UsersService {
  constructor(
    @Inject(PG_WRITE_SERVICE) private readonly pgWriteClient: ClientProxy,
    @Inject(PG_READ_SERVICE) private readonly pgReadClient: ClientProxy,
    private readonly tcpClientService: ClientTcpService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(UsersService.name);
  }

  async verifyUser(email: string, password: string) {
    const user = await this.tcpClientService.send<UserCredentialsResponseDto>(
      this.pgReadClient,
      TCP_DB_EVENTS.USER_FIND_ONE_WITH_PASSWORD,
      { email },
    );

    if (!(await bcryptjs.compare(password, user.password))) {
      throw new UnauthorizedException('Credentials are not valid ');
    }
    return user;
  }

  async create(user: UserCreateDto): Promise<User> {
    const hashedPassword = await bcryptjs.hash(user.password, 16);
    const newUser = {
      ...user,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
    };

    return await this.tcpClientService.send<User>(this.pgWriteClient, TCP_DB_EVENTS.USER_CREATE, newUser);
  }

  async getUser(getUserDto: GetUserDto) {
    return await this.tcpClientService.send<UserResponseDto>(this.pgReadClient, TCP_DB_EVENTS.USER_FIND_ONE, getUserDto);
  }
}
