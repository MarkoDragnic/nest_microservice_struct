import { Inject, Injectable, Logger, UnprocessableEntityException } from '@nestjs/common';
import {
  IndicatorsRedisRepository,
  IndicatorsUpdateDto,
  ResponseMessage,
  RobotCreateData,
  Robot,
  PG_WRITE_SERVICE,
  TCP_DB_EVENTS,
  PG_READ_SERVICE,
} from '@app/common';
import { hasher } from 'node-object-hash';
import { RobotIndicatorsService } from './robot-indicators.service';
import { ClientProxy } from '@nestjs/microservices';
import { ClientTcpService } from '@app/common/clients/client-tcp.service';

@Injectable()
export class RobotsService {
  private readonly logger = new Logger(RobotsService.name);
  private readonly sortHasher = hasher({ sort: true, alg: 'sha256' });

  constructor(
    private readonly robotIndicatorsService: RobotIndicatorsService,
    private readonly indicatorsRedisRepository: IndicatorsRedisRepository,
    @Inject(PG_WRITE_SERVICE) private readonly pgWriteClient: ClientProxy,
    @Inject(PG_READ_SERVICE) private readonly pgReadClient: ClientProxy,
    private readonly tcpClientService: ClientTcpService,
  ) {}

  async create(data: RobotCreateData): Promise<Robot> {
    const hash = this.makeRobotHash(data);
    const { accountId, ...robot } = data.robot;

    const robotData = {
      owner: { id: data.user.id },
      hash,
      account: { id: accountId },
      ...robot,
    } as Robot;

    return await this.tcpClientService.send<Robot>(this.pgWriteClient, TCP_DB_EVENTS.ROBOT_CREATE, robotData);
  }

  async upsertIndicators(indicators: IndicatorsUpdateDto): Promise<Robot> {
    const robot = await this.tcpClientService.send<Robot>(this.pgReadClient, TCP_DB_EVENTS.ROBOT_FIND_ONE, {
      id: indicators.robotId,
    });

    if (!robot) {
      throw new Error(ResponseMessage.ROBOT_NOT_FOUND);
    }

    const updatePayload = {
      robotId: indicators.robotId,
      indicators: {
        open: indicators.open,
        close: indicators.close,
      },
    };

    const response = await this.tcpClientService.send<Robot>(
      this.pgWriteClient,
      TCP_DB_EVENTS.ROBOT_INDICATORS_UPSERT,
      updatePayload,
    );

    const oldIndicators = await this.robotIndicatorsService.activeIndicators(robot.indicators ?? []);

    const newIndicators = await this.robotIndicatorsService.activeIndicators({
      open: indicators.open,
      close: indicators.close,
    } as any);
    const diff = this.changedIndicators(oldIndicators, newIndicators);

    this.indicatorsRedisRepository
      .updateIndicatorsUse(robot.fsymbol, diff)
      .catch((err) => this.logger.error('Failed to update indicator registry', err?.message));

    return response;
  }

  async getOwner(robotId: string): Promise<string> {
    const robot = await this.tcpClientService.send<Robot>(this.pgReadClient, TCP_DB_EVENTS.ROBOT_FIND_ONE, {
      id: robotId,
    });

    if (!robot?.owner.id) {
      throw new Error(ResponseMessage.ROBOT_NOT_FOUND);
    }
    return robot.owner.id;
  }

  private makeRobotHash(data: RobotCreateData): string {
    return this.sortHasher.hash({
      owner: data.user.id as string,
      name: data.robot.name,
      type: data.robot.type,
      account: data.robot.accountId,
      assets: data.robot.assets,
      instrument: data.robot.instrument,
    });
  }

  private changedIndicators(oldValues: { [p: string]: number[] }, newValues: { [p: string]: number[] }) {
    const normalize = (arr?: number[]) => [...new Set((arr ?? []).filter((n) => Number.isFinite(n)))];

    const keys = new Set<string>([...Object.keys(oldValues ?? {}), ...Object.keys(newValues ?? {})]);

    const remove: Array<{ indicator: string; period: number }> = [];
    const add: Array<{ indicator: string; period: number }> = [];

    for (const indicator of keys) {
      const oldSet = new Set<number>(normalize(oldValues?.[indicator]));
      const newSet = new Set<number>(normalize(newValues?.[indicator]));

      for (const period of oldSet) {
        if (!newSet.has(period)) remove.push({ indicator, period });
      }
      for (const period of newSet) {
        if (!oldSet.has(period)) add.push({ indicator, period });
      }
    }

    return { remove, add };
  }
}
