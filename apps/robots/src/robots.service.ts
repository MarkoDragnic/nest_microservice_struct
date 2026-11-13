import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import {
  ResponseMessage,
  RobotCreateData,
  type RobotIndicatorsUpdateData,
  type RobotResponseDto,
  TCP_DB_EVENTS,
} from '@app/contracts';
import type { ManagedRobot, RobotCreateRequest } from '@app/contracts/internal';
import { PG_WRITE_SERVICE, PG_READ_SERVICE, ClientTcpService } from '@app/messaging';
import { IndicatorsRedisRepository } from '@app/redis';
import { hasher } from 'node-object-hash';
import { RobotIndicatorsService } from './robot-indicators.service';
import { ClientProxy } from '@nestjs/microservices';

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

  // The owner comes from the authenticated user and the hash is computed here. Every other field
  // is copied from the body by name, so nothing extra in the body can reach pg_write.
  async create(data: RobotCreateData): Promise<RobotResponseDto> {
    const { robot, userId } = data;

    if (typeof userId !== 'string' || userId === '') {
      throw new BadRequestException(ResponseMessage.USER_ID_REQUIRED);
    }

    const request: RobotCreateRequest = {
      owner: { id: userId },
      account: { id: robot.accountId },
      hash: this.makeRobotHash(data),
      name: robot.name,
      fsymbol: robot.fsymbol,
      type: robot.type,
      assets: robot.assets,
      active: robot.active,
      funds: {
        initial: robot.funds.initial,
        value: robot.funds.value,
        base: robot.funds.base,
        dynamic: robot.funds.dynamic,
        partial: robot.funds.partial,
        size: robot.funds.size,
      },
      instrument: {
        name: robot.instrument.name,
        symbol: robot.instrument.symbol,
      },
    };

    return await this.tcpClientService.send<RobotResponseDto>(this.pgWriteClient, TCP_DB_EVENTS.ROBOT_CREATE, request);
  }

  async upsertIndicators(indicators: RobotIndicatorsUpdateData): Promise<RobotResponseDto> {
    const robot = await this.tcpClientService.send<ManagedRobot>(this.pgReadClient, TCP_DB_EVENTS.ROBOT_FIND_ONE, {
      id: indicators.robotId,
    });

    if (!robot) {
      throw new Error(ResponseMessage.ROBOT_NOT_FOUND);
    }

    const updatePayload = {
      robotId: indicators.robotId,
      ownerId: indicators.userId,
      indicators: {
        open: indicators.open,
        close: indicators.close,
      },
    };

    const response = await this.tcpClientService.send<RobotResponseDto>(
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
    const robot = await this.tcpClientService.send<ManagedRobot>(this.pgReadClient, TCP_DB_EVENTS.ROBOT_FIND_ONE, {
      id: robotId,
    });

    if (!robot?.owner.id) {
      throw new Error(ResponseMessage.ROBOT_NOT_FOUND);
    }
    return robot.owner.id;
  }

  private makeRobotHash(data: RobotCreateData): string {
    return this.sortHasher.hash({
      owner: data.userId,
      name: data.robot.name,
      type: data.robot.type,
      account: data.robot.accountId,
      assets: data.robot.assets,
      instrument: { name: data.robot.instrument.name, symbol: data.robot.instrument.symbol },
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
