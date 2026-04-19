import { Injectable } from '@nestjs/common';
import { Funds } from '@app/common';

@Injectable()
export class TraderQuantityService {
  getQuantity(close: number, funds: Funds): number {
    if (!Number.isFinite(close) || close <= 0) throw new Error('Invalid quantity');

    const walletValue = Number.isFinite(funds?.value) ? Number(funds.value) : NaN;
    if (!Number.isFinite(walletValue) || walletValue <= 0) throw new Error('Invalid quantity');

    const sizePct = Number.isFinite(funds?.size) ? Number(funds.size) : 100;
    const sizeFraction = sizePct > 0 && sizePct <= 1 ? sizePct : sizePct > 1 && sizePct <= 100 ? sizePct / 100 : 1;

    const allocation = walletValue * sizeFraction;
    if (!Number.isFinite(allocation) || allocation <= 0) throw new Error('Invalid quantity');

    const rawQuantity = allocation / close;
    if (!Number.isFinite(rawQuantity) || rawQuantity <= 0) throw new Error('Invalid quantity');

    const partialRaw = typeof funds?.partial === 'string' ? Number(funds.partial.trim()) : NaN;
    const precision = Number.isFinite(partialRaw) ? Math.min(12, Math.max(0, Math.floor(partialRaw))) : 8;

    const factor = 10 ** precision;
    return Math.floor(rawQuantity * factor) / factor;
  }
}
