import { Inject, Injectable } from '@nestjs/common';
import { UserCreateDto, TCP_EVENTS } from '@app/contracts';
import { AUTH_SERVICE, ClientTcpService } from '@app/messaging';
import { User } from '@app/postgres';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class UserGateService {
  constructor(
    @Inject(AUTH_SERVICE) private readonly authClient: ClientProxy,
    private readonly tcpClientService: ClientTcpService,
  ) {}

  async create(user: UserCreateDto) {
    return await this.tcpClientService.send<User>(this.authClient, TCP_EVENTS.USER_CREATE, user);
  }
}
