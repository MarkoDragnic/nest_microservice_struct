import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IIndicatorTriggerEventV1 } from '@app/contracts';

@Injectable()
export class TraderTickerFreshnessService {
  private readonly maxAgeMs: number;

  constructor(private readonly configService: ConfigService) {
    const configured = Number(this.configService.get<string>('TICKER_MAX_AGE_MS') ?? 30000);
    this.maxAgeMs = Number.isFinite(configured) && configured > 0 ? configured : 30000;
  }

  isRecent(event: IIndicatorTriggerEventV1, nowMs = Date.now()): boolean {
    const producedMs = Date.parse(event?.producedAt ?? '');
    if (!Number.isFinite(producedMs)) return false;

    return nowMs - producedMs <= this.maxAgeMs;
  }
}
