import type {
  FundsResponseDto,
  InstrumentResponseDto,
  RobotAccountResponseDto,
  RobotResponseDto,
} from '@app/contracts';
import { Account, Funds, Instrument, Robot } from '../models';

const toIso = (value: Date | string) => new Date(value).toISOString();

const toRobotAccountResponse = (account: Account): RobotAccountResponseDto => ({
  id: account.id as string,
  exchange: account.exchange,
  environment: account.environment,
  revokedAt: account.revokedAt ? toIso(account.revokedAt) : null,
});

const toFundsResponse = (funds: Funds): FundsResponseDto => ({
  initial: funds.initial,
  value: funds.value,
  reserved: funds.reserved,
  base: funds.base,
  dynamic: funds.dynamic,
  partial: funds.partial,
  size: funds.size,
});

const toInstrumentResponse = (instrument: Instrument): InstrumentResponseDto => ({
  name: instrument.name,
  symbol: instrument.symbol,
});

// A robot in the public responses. The loaded entity also carries the owner, the hash and the account's
// encrypted keys, so every field is named here and nothing else goes out.
export const toRobotResponse = (robot: Robot): RobotResponseDto => ({
  id: robot.id as string,
  name: robot.name,
  fsymbol: robot.fsymbol,
  type: robot.type,
  assets: robot.assets,
  active: robot.active,
  indicators: robot.indicators ?? null,
  createdAt: toIso(robot.createdAt as Date),
  updatedAt: toIso(robot.updatedAt as Date),
  account: robot.account ? toRobotAccountResponse(robot.account) : null,
  funds: robot.funds ? toFundsResponse(robot.funds) : null,
  instrument: robot.instrument ? toInstrumentResponse(robot.instrument) : null,
});
