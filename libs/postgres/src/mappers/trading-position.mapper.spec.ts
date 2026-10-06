import { indicatorsConfig, loadedPosition } from './fixtures';
import { toTradingPosition } from './trading-position.mapper';

describe('toTradingPosition', () => {
  it('maps the fields trader reads', () => {
    expect(toTradingPosition(loadedPosition())).toEqual({
      id: 'position-1',
      robot: { id: 'robot-1' },
      symbol: 'BTCUSDT',
      quantity: 0.01,
      entryPrice: 50000,
      rules: indicatorsConfig,
    });
  });

  it('lets no field outside the contract through', () => {
    const position = toTradingPosition(loadedPosition());

    expect(Object.keys(position).sort()).toEqual(['entryPrice', 'id', 'quantity', 'robot', 'rules', 'symbol']);
    expect(Object.keys(position.robot)).toEqual(['id']);

    const sent = JSON.stringify(position);
    expect(sent).not.toContain('api-key');
    expect(sent).not.toContain('api-secret');
    expect(sent).not.toContain('owner-password-hash');
    expect(sent).not.toContain('robot-hash');
  });
});
