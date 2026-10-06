import { Inject, Injectable } from '@nestjs/common';
import { ICandleWithIndicators, PositionCloseReason, PositionStatus, TCP_EVENTS } from '@app/contracts';
import { POSITION_SERVICE, ClientTcpService } from '@app/messaging';
import type { TradingPosition, TradingRobot } from '@app/contracts/internal';
import { catchError, firstValueFrom, of } from 'rxjs';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class TraderPositionService {
  constructor(
    @Inject(POSITION_SERVICE) private readonly positionClient: ClientProxy,
    private readonly tcpClientService: ClientTcpService,
  ) {}

  async closePosition(position: TradingPosition, candle: ICandleWithIndicators) {
    await this.tcpClientService.send(this.positionClient, TCP_EVENTS.POSITION_CLOSE, {
      positionId: position.id,
      closePrice: candle.close,
      closedAt: new Date().toISOString(),
      status: PositionStatus.CLOSED,
      symbol: candle.symbol,
      closeReason: PositionCloseReason.EXIT_ORDER,
    });
  }

  async openPosition(robot: TradingRobot, candle: ICandleWithIndicators, quantity: number) {
    await this.tcpClientService.send(this.positionClient, TCP_EVENTS.POSITION_OPEN, {
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
