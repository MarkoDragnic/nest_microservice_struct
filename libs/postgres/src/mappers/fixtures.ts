import 'reflect-metadata';
import { HlRule, PositionStatus, ProfitFactor, RobotTypes, RsiRule, type IIndicatorsConfig } from '@app/contracts';
import { Account, Funds, Instrument, Position, Robot, User } from '../models';

// Test fixtures: entities with every column and relation filled in, so a mapper that passes
// anything along beyond its contract shows up in the specs.

// Entities are filled with Object.assign: the AbstractEntity constructor argument is lost once the
// subclass fields are initialised (ES2023 class fields), so new Robot({...}) would come out empty.
const make = <T extends object>(Entity: new () => T, data: Partial<T>): T => Object.assign(new Entity(), data);

export const encrypted = (content: string) => ({ iv: 'iv', content, tag: 'tag' });

export const indicatorsConfig: IIndicatorsConfig = {
  open: {
    rsi: { enabled: true, period: 14, rule: RsiRule.LESS, value: 30 },
    hl: { enabled: false, period: 20, rule: HlRule.GREATER, value: 0 },
  },
  close: {
    take_profit: { enabled: true, factor: ProfitFactor.PERCENT, value: 5 },
    stop_lose: { enabled: true, factor: ProfitFactor.PERCENT, value: 2 },
    min_profit: { enabled: false, factor: ProfitFactor.VALUE, value: 0 },
    rsi: { enabled: false, period: 14, rule: RsiRule.GREATER, value: 70 },
    hl: { enabled: false, period: 20, rule: HlRule.LESS, value: 0 },
  },
};

export const loadedAccount = (overrides: Partial<Account> = {}) =>
  make(Account, {
    id: 'account-1',
    userId: 'user-1',
    exchange: 'binance',
    environment: 'sandbox',
    apiKeyEncrypted: encrypted('api-key'),
    apiSecretEncrypted: encrypted('api-secret'),
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    revokedAt: null,
    ...overrides,
  });

export const loadedRobot = (overrides: Partial<Robot> = {}) =>
  make(Robot, {
    id: 'robot-1',
    owner: make(User, {
      id: 'user-1',
      email: 'owner@example.com',
      password: 'owner-password-hash',
      roles: ['user'],
      notifyByEmail: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      isActive: true,
    }),
    fsymbol: 'BTCUSDT',
    name: 'Robot one',
    type: RobotTypes.TEST,
    assets: 'BTC',
    active: true,
    account: loadedAccount(),
    hash: 'robot-hash',
    funds: make(Funds, {
      id: 'funds-1',
      initial: 1000,
      value: 900,
      reserved: 50,
      base: 'USDT',
      dynamic: false,
      partial: '5',
      size: 10,
    }),
    instrument: make(Instrument, { id: 'instrument-1', name: 'Bitcoin', symbol: 'BTCUSDT' }),
    indicators: indicatorsConfig,
    createdAt: new Date('2026-01-03T00:00:00.000Z'),
    updatedAt: new Date('2026-01-04T00:00:00.000Z'),
    ...overrides,
  });

export const loadedPosition = (overrides: Partial<Position> = {}) =>
  make(Position, {
    id: 'position-1',
    robot: loadedRobot(),
    symbol: 'BTCUSDT',
    type: RobotTypes.TEST,
    status: PositionStatus.OPEN,
    entryPrice: 50000,
    closePrice: null,
    openedAt: new Date('2026-01-05T00:00:00.000Z'),
    closedAt: null,
    closeReason: null,
    quantity: 0.01,
    openTransactionValue: 500,
    closeTransactionValue: null,
    transaction: 500,
    rules: indicatorsConfig,
    ...overrides,
  });
