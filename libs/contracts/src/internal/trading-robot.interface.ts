import type { IIndicatorsConfig } from '../interfaces/indicators-config.interface';
import type { AccountCredentials } from './account-credentials.interface';

export interface TradingFunds {
  value: number;
  size: number;
  partial: string;
}

// account and funds are null when the robot has none linked.
export interface TradingRobot {
  id: string;
  account: AccountCredentials | null;
  funds: TradingFunds | null;
  indicators?: IIndicatorsConfig;
}
