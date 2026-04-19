import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TCP_EVENTS, AssignmentDto } from '@app/common';
import { LoggerService } from '@app/common/logger';
import { ProviderManagerService } from './services/provider-manager.service';

@Controller()
export class PriceProviderController {
  constructor(
    private readonly providerManager: ProviderManagerService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext(PriceProviderController.name);
  }

  @MessagePattern(TCP_EVENTS.PRICE_PROVIDER_SUBSCRIBE)
  async subscribe(@Payload() dto: AssignmentDto): Promise<{ success: boolean }> {
    this.logger.log('Subscribe command received', { providerId: dto.providerId, symbol: dto.command.symbol });
    await this.providerManager.addSymbols(dto.providerId, [dto.command.symbol]);
    return { success: true };
  }

  @MessagePattern(TCP_EVENTS.PRICE_PROVIDER_UNSUBSCRIBE)
  async unsubscribe(@Payload() dto: AssignmentDto): Promise<{ success: boolean }> {
    this.logger.log('Unsubscribe command received', { providerId: dto.providerId, symbol: dto.command.symbol });
    await this.providerManager.removeSymbols(dto.providerId, [dto.command.symbol]);
    return { success: true };
  }
}
