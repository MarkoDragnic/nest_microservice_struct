import { Inject, Injectable } from '@nestjs/common';
import {
  ICandleWithIndicators,
  POSITION_SERVICE,
  PositionCloseReason,
  Position,
  PositionStatus,
  Robot,
  TCP_EVENTS,
} from '@app/common';
import { catchError, firstValueFrom, of } from 'rxjs';
import { ClientProxy } from '@nestjs/microservices';
import { ClientTcpService } from '@app/common/clients/client-tcp.service';

@Injectable()
export class TraderPositionService {
  constructor(
    @Inject(POSITION_SERVICE) private readonly positionClient: ClientProxy,
    private readonly tcpClientService: ClientTcpService,
  ) {}

  async closePosition(position: Position, candle: ICandleWithIndicators) {
    await this.tcpClientService.send<Position>(this.positionClient, TCP_EVENTS.POSITION_CLOSE, {
      positionId: position.id,
      closePrice: candle.close,
      closedAt: new Date().toISOString(),
      status: PositionStatus.CLOSED,
      symbol: candle.symbol,
      closeReason: PositionCloseReason.EXIT_ORDER,
    });
  }

  async openPosition(robot: Robot, candle: ICandleWithIndicators, quantity: number) {
    await this.tcpClientService.send<Position>(this.positionClient, TCP_EVENTS.POSITION_OPEN, {
      entryPrice: candle.close,
      openedAt: new Date().toISOString(),
      quantity,
      robotId: robot.id,
      status: PositionStatus.OPEN,
      symbol: candle.symbol,
      rules: robot.indicators,
    });
  }
}
