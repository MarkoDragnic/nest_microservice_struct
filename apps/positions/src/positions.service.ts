import { Inject, Injectable } from '@nestjs/common';
import {
  ClosePositionDto,
  INotificationPositionMailDto,
  INotificationUser,
  NotificationTypes,
  OpenPositionDto,
  TCP_DB_EVENTS,
} from '@app/contracts';
import type { PositionChange, PositionRobot, RobotNotificationTarget } from '@app/contracts/internal';
import { PG_READ_SERVICE, PG_WRITE_SERVICE, ClientTcpService } from '@app/messaging';
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

  async create(data: OpenPositionDto): Promise<void> {
    const position = await this.tcpClientService.send<PositionChange>(
      this.pgWriteClient,
      TCP_DB_EVENTS.POSITION_OPEN_TRANSACTIONAL,
      data,
    );
    const robot = await this.tcpClientService.send<RobotNotificationTarget>(
      this.pgReadClient,
      TCP_DB_EVENTS.ROBOT_FIND_NOTIFICATION_TARGET,
      { id: data.robotId },
    );

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
  }

  async close(data: ClosePositionDto): Promise<void> {
    const position = await this.tcpClientService.send<PositionChange>(
      this.pgWriteClient,
      TCP_DB_EVENTS.POSITION_CLOSE_TRANSACTIONAL,
      data,
    );
    const currentPosition = await this.tcpClientService.send<PositionRobot>(
      this.pgReadClient,
      TCP_DB_EVENTS.POSITION_FIND_ONE,
      { id: position.id },
    );
    const robot = currentPosition.robot;

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
  }

  private toNotificationUser(owner: RobotNotificationTarget['owner']): INotificationUser {
    return {
      email: owner.email,
      notifyByEmail: owner.notifyByEmail,
    };
  }

  private toIsoString(value: Date | string | null | undefined) {
    if (!value) {
      return undefined;
    }

    return value instanceof Date ? value.toISOString() : value;
  }
}
