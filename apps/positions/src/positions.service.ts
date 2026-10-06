import { Inject, Injectable } from '@nestjs/common';
import {
  ClosePositionDto,
  INotificationPositionMailDto,
  NotificationTypes,
  OpenPositionDto,
  TCP_DB_EVENTS,
  UserResponseDto,
} from '@app/contracts';
import { PG_READ_SERVICE, PG_WRITE_SERVICE, ClientTcpService } from '@app/messaging';
import { Robot, Position } from '@app/postgres';
import { PositionNotificationService } from './position-notification.service';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class PositionsService {
  constructor(
    @Inject(PG_WRITE_SERVICE) private readonly pgWriteClient: ClientProxy,
    @Inject(PG_READ_SERVICE) private readonly pgReadClient: ClientProxy,
    private readonly tcpClientService: ClientTcpService,
    private readonly positionNotificationService: PositionNotificationService,
  ) {}

  async create(data: OpenPositionDto) {
    const position = await this.tcpClientService.send<Position>(this.pgWriteClient, TCP_DB_EVENTS.POSITION_OPEN_TRANSACTIONAL, data);
    const robot = await this.tcpClientService.send<Robot>(this.pgReadClient, TCP_DB_EVENTS.ROBOT_FIND_ONE, {
      id: data.robotId,
    });

    void this.positionNotificationService.sendNotification({
      type: NotificationTypes.POSITION_OPEN,
      data: {
        user: this.toNotificationUser(robot.owner),
        positionId: position.id ?? '',
        symbol: position.symbol,
        entryPrice: position.entryPrice,
        quantity: position.quantity,
        openedAt: position.openedAt,
        robotName: robot.name,
      },
    } as INotificationPositionMailDto);
    return position;
  }

  async close(data: ClosePositionDto) {
    const position = await this.tcpClientService.send<Position>(this.pgWriteClient, TCP_DB_EVENTS.POSITION_CLOSE_TRANSACTIONAL, data);
    const currentPosition = await this.tcpClientService.send<Position>(this.pgReadClient, TCP_DB_EVENTS.POSITION_FIND_ONE, {
      id: position.id,
    });
    const robot = currentPosition.robot as Robot;

    void this.positionNotificationService.sendNotification({
      type: NotificationTypes.POSITION_CLOSE,
      data: {
        user: this.toNotificationUser(robot.owner),
        positionId: position.id ?? '',
        symbol: position.symbol,
        entryPrice: position.entryPrice,
        closePrice: position.closePrice ?? undefined,
        quantity: position.quantity,
        openedAt: position.openedAt,
        closedAt: this.toIsoString(position.closedAt),
        robotName: robot.name,
        profit: position.transaction,
      },
    } as INotificationPositionMailDto);

    return position;
  }

  private toNotificationUser(user: Robot['owner']): UserResponseDto {
    return {
      id: user.id ?? '',
      email: user.email,
      roles: user.roles ?? [],
      notifyByEmail: user.notifyByEmail,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      isActive: user.isActive,
    };
  }

  private toIsoString(value: Date | string | null | undefined) {
    if (!value) {
      return undefined;
    }

    return value instanceof Date ? value.toISOString() : value;
  }
}
