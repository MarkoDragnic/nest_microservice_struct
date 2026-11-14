import type { AccountCredentials, TradingFunds, TradingRobot } from '@app/contracts/internal';
import { Account, Funds, Robot } from '../models';

// Each mapper lists its fields one by one. Never spread an entity here: the contract is the
// only thing that may leave the service.

const toAccountCredentials = (account: Account): AccountCredentials => ({
  environment: account.environment,
  revokedAt: account.revokedAt ? new Date(account.revokedAt).toISOString() : null,
  apiKeyEncrypted: account.apiKeyEncrypted,
  apiSecretEncrypted: account.apiSecretEncrypted,
});

const toTradingFunds = (funds: Funds): TradingFunds => ({
  value: funds.value,
  size: funds.size,
  partial: funds.partial,
});

export const toTradingRobot = (robot: Robot): TradingRobot => ({
  id: robot.id as string,
  account: robot.account ? toAccountCredentials(robot.account) : null,
  funds: robot.funds ? toTradingFunds(robot.funds) : null,
  indicators: robot.indicators,
});
