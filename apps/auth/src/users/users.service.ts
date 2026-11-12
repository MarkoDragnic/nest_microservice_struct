import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthenticatedUser, TCP_DB_EVENTS, UserCreateDto, UserResponseDto } from '@app/contracts';
import type { UserCreateRequest, UserCredentials } from '@app/contracts/internal';
import { LoggerService } from '@app/core';
import { PG_READ_SERVICE, PG_WRITE_SERVICE, ClientTcpService } from '@app/messaging';
import bcryptjs from 'bcryptjs';
import { randomBytes } from 'crypto';
import { GetUserDto } from './dto/get-user.dto';
import { ClientProxy } from '@nestjs/microservices';
import { isNotFound } from '../is-not-found';

const BCRYPT_COST = 12;
const INVALID_CREDENTIALS = 'Credentials are not valid.';

@Injectable()
export class UsersService {
  private readonly dummyHash = bcryptjs.hashSync(randomBytes(32).toString('hex'), BCRYPT_COST);

  constructor(
    @Inject(PG_WRITE_SERVICE) private readonly pgWriteClient: ClientProxy,
    @Inject(PG_READ_SERVICE) private readonly pgReadClient: ClientProxy,
    private readonly tcpClientService: ClientTcpService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(UsersService.name);
  }

  async verifyUser(email: string, password: string): Promise<AuthenticatedUser> {
    let user: UserCredentials;
    try {
      user = await this.tcpClientService.send<UserCredentials>(
        this.pgReadClient,
        TCP_DB_EVENTS.USER_FIND_ONE_WITH_PASSWORD,
        { email },
      );
    } catch (error) {
      if (!isNotFound(error)) throw error;
      await bcryptjs.compare(password, this.dummyHash);
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    if (!(await bcryptjs.compare(password, user.password))) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }
    // The login needs the id. The password hash stays in this method.
    return { id: user.id };
  }

  async create(user: UserCreateDto): Promise<UserResponseDto> {
    const now = new Date().toISOString();
    const newUser: UserCreateRequest = {
      email: user.email,
      password: await bcryptjs.hash(user.password, BCRYPT_COST),
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
