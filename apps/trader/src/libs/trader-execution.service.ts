import { Injectable } from '@nestjs/common';
import { ICandleWithIndicators, Environment } from '@app/contracts';
import { LoggerService } from '@app/core';
import { Account, Position, Robot } from '@app/postgres';
import { TraderPositionService } from './trader-position.service';
import { TraderQuantityService } from './trader-quantity.service';
import { TraderBinanceService } from '../binance/trader-binance.service';

@Injectable()
export class TraderExecutionService {
  constructor(
    private readonly traderPositionService: TraderPositionService,
    private readonly quantityService: TraderQuantityService,
    private readonly binanceService: TraderBinanceService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(TraderExecutionService.name);
  }

  async close(robot: Robot, position: Position, candle: ICandleWithIndicators) {
    try {
      const account = robot.account;
      this.isRevoked(account);

      if (account.environment === Environment.TEST) {
        await this.traderPositionService.closePosition(position, candle);
      } else {
        const cred = await this.binanceService.getCredentials(account);
        const signal = await this.binanceService.getSignal(position.symbol, 'SELL', 'MARKET', position.quantity);
        await this.binanceService.sendSignal(cred, signal);
        await this.traderPositionService.closePosition(position, candle);
      }
    } catch (e) {
      this.logger.error('Failed to close position', { error: e?.message, stack: e?.stack });
      throw e;
    }
  }

  async open(robot: Robot, candle: ICandleWithIndicators) {
    try {
      const account = robot.account;
      this.isRevoked(account);
      const quantity = this.quantityService.getQuantity(candle.close, robot.funds);

      if (account.environment === Environment.TEST) {
        await this.traderPositionService.openPosition(robot, candle, quantity);
      } else {
        const cred = await this.binanceService.getCredentials(account);
        const signal = await this.binanceService.getSignal(candle.symbol, 'BUY', 'MARKET', quantity);
        await this.binanceService.sendSignal(cred, signal);
        await this.traderPositionService.openPosition(robot, candle, quantity);
      }
    } catch (e) {
      this.logger.error('Failed to open position', { error: e?.message, stack: e?.stack });
      throw e;
    }
  }

  private isRevoked(account: Account) {
    if (!account) throw new Error('Robot account not loaded');
    if (account.revokedAt) {
      throw new Error('Account revoked');
    }
  }
}
