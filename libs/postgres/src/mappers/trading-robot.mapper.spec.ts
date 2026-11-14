import { encrypted, indicatorsConfig, loadedAccount, loadedRobot } from './fixtures';
import { toTradingRobot } from './trading-robot.mapper';

describe('toTradingRobot', () => {
  it('maps the fields trader reads', () => {
    expect(toTradingRobot(loadedRobot())).toEqual({
      id: 'robot-1',
      account: {
        environment: 'sandbox',
        revokedAt: null,
        apiKeyEncrypted: encrypted('api-key'),
        apiSecretEncrypted: encrypted('api-secret'),
      },
      funds: { value: 900, size: 10, partial: '5' },
      indicators: indicatorsConfig,
    });
  });

  it('lets no field outside the contract through', () => {
    const robot = toTradingRobot(loadedRobot());

    expect(Object.keys(robot).sort()).toEqual(['account', 'funds', 'id', 'indicators']);
    expect(Object.keys(robot.account ?? {}).sort()).toEqual([
      'apiKeyEncrypted',
      'apiSecretEncrypted',
      'environment',
      'revokedAt',
    ]);
    expect(Object.keys(robot.funds ?? {}).sort()).toEqual(['partial', 'size', 'value']);

    const sent = JSON.stringify(robot);
    expect(sent).not.toContain('owner-password-hash');
    expect(sent).not.toContain('robot-hash');
  });

  it('sends revokedAt as an ISO string', () => {
    const robot = loadedRobot({ account: loadedAccount({ revokedAt: new Date('2026-02-03T04:05:06.000Z') }) });

    expect(toTradingRobot(robot).account?.revokedAt).toBe('2026-02-03T04:05:06.000Z');
  });

  it('maps a robot with no account or funds linked to nulls', () => {
    const robot = loadedRobot({ account: null as never, funds: null as never });

    expect(toTradingRobot(robot)).toEqual({ id: 'robot-1', account: null, funds: null, indicators: indicatorsConfig });
  });
});
