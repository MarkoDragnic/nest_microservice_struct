import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Inject } from '@nestjs/common';
import { ROBOTS_SERVICE } from '@app/common/clients/services';
import { TCP_EVENTS } from '@app/contracts/tcp';
import { ClientTcpService } from '@app/common/clients/client-tcp.service';

@Injectable()
export class OwnRobotGuard implements CanActivate {
  constructor(
    @Inject(ROBOTS_SERVICE) private readonly robotsClient: ClientProxy,
    private readonly tcpClientService: ClientTcpService,
  ) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const userId: string | undefined = request?.user?.id?.toString();
    if (!userId) return false;

    const robotId: string | undefined = request?.body?.robotId ?? request?.params?.robotId ?? request?.params?.id;
    if (!robotId) return false;

    return this.isOwner(userId, robotId);
  }

  private async isOwner(userId: string, robotId: string): Promise<boolean> {
    const res = await this.tcpClientService.send<{ owner: string }>(this.robotsClient, TCP_EVENTS.ROBOT_GET_OWNER, {
      robot: robotId,
    });

    return res.owner === userId;
  }
}
