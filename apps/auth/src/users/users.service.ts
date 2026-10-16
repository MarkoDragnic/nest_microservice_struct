import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthenticatedUser, TCP_DB_EVENTS, UserCreateDto, UserResponseDto } from '@app/contracts';
import type { UserCreateRequest, UserCredentials } from '@app/contracts/internal';
import { LoggerService } from '@app/core';
import { PG_READ_SERVICE, PG_WRITE_SERVICE, ClientTcpService } from '@app/messaging';
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

  async verifyUser(email: string, password: string): Promise<AuthenticatedUser> {
    const user = await this.tcpClientService.send<UserCredentials>(
      this.pgReadClient,
      TCP_DB_EVENTS.USER_FIND_ONE_WITH_PASSWORD,
      { email },
    );

    if (!(await bcryptjs.compare(password, user.password))) {
      throw new UnauthorizedException('Credentials are not valid ');
    }
    // The login needs the id. The password hash stays in this method.
    return { id: user.id };
  }

  async create(user: UserCreateDto): Promise<UserResponseDto> {
    const now = new Date().toISOString();
    const newUser: UserCreateRequest = {
      email: user.email,
      password: await bcryptjs.hash(user.password, 16),
      notifyByEmail: user.notifyByEmail,
      createdAt: now,
      updatedAt: now,
      isActive: true,
    };

    return await this.tcpClientService.send<UserResponseDto>(this.pgWriteClient, TCP_DB_EVENTS.USER_CREATE, newUser);
  }

  async getUser(getUserDto: GetUserDto) {
    return await this.tcpClientService.send<UserResponseDto>(this.pgReadClient, TCP_DB_EVENTS.USER_FIND_ONE, getUserDto);
  }
}
