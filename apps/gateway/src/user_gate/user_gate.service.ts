import { Inject, Injectable } from '@nestjs/common';
import { AUTH_SERVICE, UserCreateDto, User, TCP_EVENTS } from '@app/common';
import { ClientProxy } from '@nestjs/microservices';

import { ClientTcpService } from '@app/common/clients/client-tcp.service';

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
