import { Inject, Injectable } from '@nestjs/common';
import {
  IndicatorsUpdateDto,
  RobotCreateData,
  type RobotIndicatorsUpdateData,
  RobotResponseDto,
  TCP_DB_EVENTS,
  TCP_EVENTS,
} from '@app/contracts';
import { PG_READ_SERVICE, ROBOTS_SERVICE, ClientTcpService } from '@app/messaging';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class RobotGateService {
  constructor(
    @Inject(ROBOTS_SERVICE) private readonly robotClient: ClientProxy,
    @Inject(PG_READ_SERVICE) private readonly pgReadClient: ClientProxy,
    private readonly tcpClientService: ClientTcpService,
  ) {}

  async createRobot(data: RobotCreateData) {
    return await this.tcpClientService.send<RobotResponseDto>(this.robotClient, TCP_EVENTS.ROBOT_CREATE, data);
  }

  async upsertIndicators(userId: string, indicators: IndicatorsUpdateDto) {
    const data: RobotIndicatorsUpdateData = {
      robotId: indicators.robotId,
      open: indicators.open,
      close: indicators.close,
      userId,
    };

    return await this.tcpClientService.send<RobotResponseDto>(
      this.robotClient,
      TCP_EVENTS.ROBOT_INDICATORS_UPSERT,
      data,
    );
  }

  async listRobots(userId: string, page: number, limit: number) {
    return await this.tcpClientService.send(this.pgReadClient, TCP_DB_EVENTS.ROBOT_FIND_PAGINATED, {
      userId,
      page,
      limit,
    });
  }

  async listPositions(userId: string, page: number, limit: number) {
    return await this.tcpClientService.send(this.pgReadClient, TCP_DB_EVENTS.POSITION_FIND_PAGINATED, {
      userId,
      page,
      limit,
    });
  }
}
