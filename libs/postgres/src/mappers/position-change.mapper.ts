import type { PositionChange } from '@app/contracts/internal';
import { Position } from '../models';

const toIso = (value: Date | string) => new Date(value).toISOString();

export const toPositionChange = (position: Position): PositionChange => ({
  id: position.id as string,
  symbol: position.symbol,
  entryPrice: position.entryPrice,
  quantity: position.quantity,
  openedAt: toIso(position.openedAt),
  closePrice: position.closePrice ?? null,
  closedAt: position.closedAt ? toIso(position.closedAt) : null,
  transaction: position.transaction,
});
