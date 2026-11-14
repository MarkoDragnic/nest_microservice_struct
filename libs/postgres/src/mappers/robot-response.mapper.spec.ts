import 'reflect-metadata';
import { RobotTypes } from '@app/contracts';
import { indicatorsConfig, loadedAccount, loadedRobot } from './fixtures';
import { toRobotResponse } from './robot-response.mapper';

describe('toRobotResponse', () => {
  it('maps the public fields of a robot', () => {
    expect(toRobotResponse(loadedRobot())).toEqual({
      id: 'robot-1',
      name: 'Robot one',
      fsymbol: 'BTCUSDT',
      type: RobotTypes.TEST,
      assets: 'BTC',
      active: true,
      indicators: indicatorsConfig,
      createdAt: '2026-01-03T00:00:00.000Z',
      updatedAt: '2026-01-04T00:00:00.000Z',
      account: { id: 'account-1', exchange: 'binance', environment: 'sandbox', revokedAt: null },
      funds: { initial: 1000, value: 900, reserved: 50, base: 'USDT', dynamic: false, partial: '5', size: 10 },
      instrument: { name: 'Bitcoin', symbol: 'BTCUSDT' },
    });
  });

  it('sends the date an account was revoked as an ISO string', () => {
    const robot = loadedRobot({ account: loadedAccount({ revokedAt: new Date('2026-02-03T04:05:06.000Z') }) });

    expect(toRobotResponse(robot).account?.revokedAt).toBe('2026-02-03T04:05:06.000Z');
  });

  it('answers null, not a missing field, for a relation or indicators the robot does not have', () => {
    const robot = loadedRobot({
      account: null as never,
      funds: null as never,
      instrument: null as never,
      indicators: undefined,
    });

    expect(JSON.parse(JSON.stringify(toRobotResponse(robot)))).toMatchObject({
      account: null,
      funds: null,
      instrument: null,
      indicators: null,
    });
  });

  it('lets no field outside the contract through', () => {
    const robot = toRobotResponse(loadedRobot());

    expect(Object.keys(robot).sort()).toEqual([
      'account',
      'active',
      'assets',
      'createdAt',
      'fsymbol',
      'funds',
      'id',
      'indicators',
      'instrument',
      'name',
      'type',
      'updatedAt',
    ]);
    expect(Object.keys(robot.account ?? {}).sort()).toEqual(['environment', 'exchange', 'id', 'revokedAt']);
    expect(Object.keys(robot.funds ?? {}).sort()).toEqual([
      'base',
      'dynamic',
      'initial',
      'partial',
      'reserved',
      'size',
      'value',
    ]);
    expect(Object.keys(robot.instrument ?? {}).sort()).toEqual(['name', 'symbol']);

    const sent = JSON.stringify(robot);
    expect(sent).not.toContain('api-key');
    expect(sent).not.toContain('api-secret');
    expect(sent).not.toContain('owner@example.com');
    expect(sent).not.toContain('owner-password-hash');
    expect(sent).not.toContain('user-1');
    expect(sent).not.toContain('robot-hash');
    expect(sent).not.toContain('funds-1');
    expect(sent).not.toContain('instrument-1');
  });
});
