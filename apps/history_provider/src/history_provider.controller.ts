import { Controller, UseFilters, UseGuards } from '@nestjs/common';
import { HistoryProviderService } from './history_provider.service';
import { MessagePattern, Payload, Transport } from '@nestjs/microservices';
import { type HistoryMinuteDataRequest } from './types/historic-data.types';
import { ResponseMessage, TCP_EVENTS, tcpOk } from '@app/contracts';
import { GlobalRpcExceptionFilter, InternalRpcGuard, LoggerService } from '@app/core';

@UseFilters(GlobalRpcExceptionFilter)
@UseGuards(InternalRpcGuard)
@Controller()
export class HistoryProviderController {
  constructor(
    private readonly historyProviderService: HistoryProviderService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(HistoryProviderController.name);
  }

  @MessagePattern(TCP_EVENTS.HISTORY_MINUTE_DATA, Transport.TCP)
  async getMinuteDataHistory(@Payload() data: HistoryMinuteDataRequest) {
    const closePrices = await this.historyProviderService.getHistoricData(data);
    return tcpOk(closePrices, ResponseMessage.HISTORY_DATA_READY);
  }
}
