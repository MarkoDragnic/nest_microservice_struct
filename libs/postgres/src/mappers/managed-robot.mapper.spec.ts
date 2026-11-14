import { indicatorsConfig, loadedRobot } from './fixtures';
import { toManagedRobot } from './managed-robot.mapper';

describe('toManagedRobot', () => {
  it('maps the symbol, the indicators and the owner id', () => {
    expect(toManagedRobot(loadedRobot())).toEqual({
      fsymbol: 'BTCUSDT',
      indicators: indicatorsConfig,
      owner: { id: 'user-1' },
    });
  });

  it('lets no field outside the contract through, in particular no owner contact fields', () => {
    const robot = toManagedRobot(loadedRobot());

    expect(Object.keys(robot).sort()).toEqual(['fsymbol', 'indicators', 'owner']);
    expect(Object.keys(robot.owner)).toEqual(['id']);

    const sent = JSON.stringify(robot);
    expect(sent).not.toContain('owner@example.com');
    expect(sent).not.toContain('owner-password-hash');
    expect(sent).not.toContain('api-key');
    expect(sent).not.toContain('robot-hash');
  });
});
