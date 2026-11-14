import { loadedPosition } from './fixtures';
import { toPositionChange } from './position-change.mapper';

describe('toPositionChange', () => {
  it('maps an open position', () => {
    expect(toPositionChange(loadedPosition())).toEqual({
      id: 'position-1',
      symbol: 'BTCUSDT',
      entryPrice: 50000,
      quantity: 0.01,
      openedAt: '2026-01-05T00:00:00.000Z',
      closePrice: null,
      closedAt: null,
      transaction: 500,
    });
  });

  it('maps a closed position, with closedAt as an ISO string', () => {
    const closed = loadedPosition({
      closePrice: 51000,
      closedAt: new Date('2026-01-06T07:08:09.000Z'),
      transaction: 10,
    });

    expect(toPositionChange(closed)).toEqual({
      id: 'position-1',
      symbol: 'BTCUSDT',
      entryPrice: 50000,
      quantity: 0.01,
      openedAt: '2026-01-05T00:00:00.000Z',
      closePrice: 51000,
      closedAt: '2026-01-06T07:08:09.000Z',
      transaction: 10,
    });
  });

  it('maps close fields that were never set to null', () => {
    const justOpened = loadedPosition({ closePrice: undefined, closedAt: undefined });

    expect(toPositionChange(justOpened)).toMatchObject({ closePrice: null, closedAt: null });
  });

  it('lets no field outside the contract through', () => {
    const change = toPositionChange(loadedPosition());

    expect(Object.keys(change).sort()).toEqual([
      'closePrice',
      'closedAt',
      'entryPrice',
      'id',
      'openedAt',
      'quantity',
      'symbol',
      'transaction',
    ]);

    const sent = JSON.stringify(change);
    expect(sent).not.toContain('robot-hash');
    expect(sent).not.toContain('api-key');
    expect(sent).not.toContain('owner@example.com');
  });
});
