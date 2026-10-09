import type { PositionResponseDto } from '@app/contracts';
import { Position } from '../models';

const toIso = (value: Date | string) => new Date(value).toISOString();

// A position in the public list. The loaded entity also carries the robot's owner, account, funds and
// instrument, so every field is named here and nothing else goes out.
export const toPositionResponse = (position: Position): PositionResponseDto => ({
  id: position.id as string,
  symbol: position.symbol,
  type: position.type,
  status: position.status,
  entryPrice: position.entryPrice,
  closePrice: position.closePrice ?? null,
  quantity: position.quantity,
  openTransactionValue: position.openTransactionValue ?? null,
  closeTransactionValue: position.closeTransactionValue ?? null,
  closeReason: position.closeReason ?? null,
  openedAt: toIso(position.openedAt),
  closedAt: position.closedAt ? toIso(position.closedAt) : null,
  robot: { id: position.robot.id as string, name: position.robot.name },
});
