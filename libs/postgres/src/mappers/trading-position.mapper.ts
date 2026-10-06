import type { TradingPosition } from '@app/contracts/internal';
import { Position } from '../models';

export const toTradingPosition = (position: Position): TradingPosition => ({
  id: position.id as string,
  robot: { id: position.robot.id as string },
  symbol: position.symbol,
  quantity: position.quantity,
  entryPrice: position.entryPrice,
  rules: position.rules,
});
