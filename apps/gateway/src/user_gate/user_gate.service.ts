import { Inject, Injectable } from '@nestjs/common';
import { UserCreateDto, TCP_EVENTS, UserResponseDto } from '@app/contracts';
import { AUTH_SERVICE, ClientTcpService } from '@app/messaging';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class UserGateService {
  constructor(
    @Inject(AUTH_SERVICE) private readonly authClient: ClientProxy,
    private readonly tcpClientService: ClientTcpService,
  ) {}

  async create(user: UserCreateDto) {
    return await this.tcpClientService.send<UserResponseDto>(this.authClient, TCP_EVENTS.USER_CREATE, user);
  }
}
