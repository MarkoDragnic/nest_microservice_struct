import { Inject, Injectable } from '@nestjs/common';
import { IIndicatorTriggerEventV1, PG_READ_SERVICE, Position, Robot, TCP_DB_EVENTS } from '@app/common';
import { LoggerService } from '@app/common/logger';
import { TraderCloseRulesService } from './rules/trader-close-rules.service';
import { TraderOpenRulesService } from './rules/trader-open-rules.service';
import { TraderBatchService } from './libs/trader-batch.service';

import { TraderExecutionService } from './libs/trader-execution.service';
import { ClientProxy } from '@nestjs/microservices';
import { ClientTcpService } from '@app/common/clients/client-tcp.service';

@Injectable()
export class TraderService {
  private static readonly ROBOT_PROCESS_BATCH_SIZE = 25;

  constructor(
    @Inject(PG_READ_SERVICE) private readonly pgReadClient: ClientProxy,
    private readonly tcpClientService: ClientTcpService,
    private readonly traderCloseRulesService: TraderCloseRulesService,
    private readonly traderOpenRulesService: TraderOpenRulesService,
    private readonly batchService: TraderBatchService,
    private readonly traderExecutionService: TraderExecutionService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(TraderService.name);
  }

  async handleIndicatorTrigger(ticker: IIndicatorTriggerEventV1): Promise<void> {
    const symbol = ticker.candle.symbol;
    const robots = await this.tcpClientService.send<Robot[]>(
      this.pgReadClient,
      TCP_DB_EVENTS.ROBOT_FIND_ALL_BY_SYMBOL,
      symbol,
    );

    if (robots.length > 0) {
      const robotIds = robots.map((r) => r.id as string);
      const openPositions = await this.tcpClientService.send<Position[]>(
        this.pgReadClient,
        TCP_DB_EVENTS.POSITION_OPEN_FOR_ROBOTS,
        { robotIds, symbol },
      );

      const positionsByRobotId = new Map<string, typeof openPositions>();

      for (const pos of openPositions) {
        const key = String(pos.robot?.id);
        const list = positionsByRobotId.get(key) ?? [];
        list.push(pos);
        positionsByRobotId.set(key, list);
      }

      await this.batchService.processInBatches(robots, TraderService.ROBOT_PROCESS_BATCH_SIZE, async (robot) => {
        const robotId = robot.id as string;
        const positions = positionsByRobotId.get(robotId) ?? [];

        if (positions.length > 0) {
          for (const position of positions) {
            if (!position.rules) continue;

            if (this.traderCloseRulesService.exitOrders(position.rules.close, ticker.candle, position.entryPrice)) {
              await this.traderExecutionService.close(robot, position, ticker.candle);
              return;
            }

            if (
              this.traderCloseRulesService.exitWithIndicators(position.rules.close, ticker.candle, position.entryPrice)
            ) {
              await this.traderExecutionService.close(robot, position, ticker.candle);
              return;
            }
          }
          return;
        }

        if (robot.indicators && this.traderOpenRulesService.openWithIndicators(robot.indicators.open, ticker.candle)) {
          await this.traderExecutionService.open(robot, ticker.candle);

          return;
        }
      });
    }
  }
}
