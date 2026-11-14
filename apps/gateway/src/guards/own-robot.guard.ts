import { BadRequestException, CanActivate, ExecutionContext, Injectable, NotFoundException } from '@nestjs/common';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { Inject } from '@nestjs/common';
import { isUUID } from 'class-validator';
import { ResponseMessage, TCP_EVENTS } from '@app/contracts';
import { ROBOTS_SERVICE, ClientTcpService } from '@app/messaging';

const isRobotId = (value: unknown): value is string => isUUID(value);

const isNotFound = (error: unknown): boolean =>
  error instanceof RpcException && (error.getError() as { statusCode?: number })?.statusCode === 404;

@Injectable()
export class OwnRobotGuard implements CanActivate {
  constructor(
    @Inject(ROBOTS_SERVICE) private readonly robotsClient: ClientProxy,
    private readonly tcpClientService: ClientTcpService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const userId: string | undefined = request?.user?.id?.toString();
    if (!userId) return false;

    const robotId: unknown = request?.body?.robotId ?? request?.params?.robotId ?? request?.params?.id;
    if (!isRobotId(robotId)) {
      throw new BadRequestException('robotId must be a UUID');
    }

    if ((await this.ownerOf(robotId)) !== userId) {
      throw new NotFoundException(ResponseMessage.ROBOT_NOT_FOUND);
    }

    return true;
  }

  private async ownerOf(robotId: string): Promise<string | null> {
    try {
      const res = await this.tcpClientService.send<{ owner: string }>(this.robotsClient, TCP_EVENTS.ROBOT_GET_OWNER, {
        robot: robotId,
      });

      return res.owner;
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  }
}
