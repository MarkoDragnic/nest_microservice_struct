import { Inject, Injectable } from '@nestjs/common';
import { IndicatorsUpdateDto, RobotCreateData, TCP_DB_EVENTS, TCP_EVENTS } from '@app/contracts';
import { PG_READ_SERVICE, ROBOTS_SERVICE, ClientTcpService } from '@app/messaging';
import { Robot } from '@app/postgres';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class RobotGateService {
  constructor(
    @Inject(ROBOTS_SERVICE) private readonly robotClient: ClientProxy,
    @Inject(PG_READ_SERVICE) private readonly pgReadClient: ClientProxy,
    private readonly tcpClientService: ClientTcpService,
  ) {}

  async createRobot(data: RobotCreateData) {
    return await this.tcpClientService.send<Robot>(this.robotClient, TCP_EVENTS.ROBOT_CREATE, data);
  }

  async upsertIndicators(indicators: IndicatorsUpdateDto) {
    return await this.tcpClientService.send<Robot>(this.robotClient, TCP_EVENTS.ROBOT_INDICATORS_UPSERT, indicators);
  }

  async listRobots(userId: string, page: number, limit: number) {
    return await this.tcpClientService.send(this.pgReadClient, TCP_DB_EVENTS.ROBOT_FIND_PAGINATED, { userId, page, limit });
  }

  async listPositions(userId: string, page: number, limit: number) {
    return await this.tcpClientService.send(this.pgReadClient, TCP_DB_EVENTS.POSITION_FIND_PAGINATED, { userId, page, limit });
  }
}
