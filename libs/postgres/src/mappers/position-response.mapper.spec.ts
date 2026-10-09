import 'reflect-metadata';
import { PositionCloseReason, PositionStatus, RobotTypes } from '@app/contracts';
import { indicatorsConfig, loadedPosition } from './fixtures';
import { toPositionResponse } from './position-response.mapper';

describe('toPositionResponse', () => {
  it('maps the public fields of an open position, with null for what closing fills in', () => {
    expect(toPositionResponse(loadedPosition())).toEqual({
      id: 'position-1',
      symbol: 'BTCUSDT',
      type: RobotTypes.TEST,
      status: PositionStatus.OPEN,
      entryPrice: 50000,
      closePrice: null,
      quantity: 0.01,
      openTransactionValue: 500,
      closeTransactionValue: null,
      transaction: 500,
      closeReason: null,
      openedAt: '2026-01-05T00:00:00.000Z',
      closedAt: null,
      rules: indicatorsConfig,
      robot: { id: 'robot-1', name: 'Robot one' },
    });
  });

  it('maps the closing fields of a closed position', () => {
    const closed = loadedPosition({
      status: PositionStatus.CLOSED,
      closePrice: 51000,
      closedAt: new Date('2026-01-06T00:00:00.000Z'),
      closeReason: PositionCloseReason.STRATEGY,
      closeTransactionValue: 510,
      transaction: 10,
    });

    expect(toPositionResponse(closed)).toMatchObject({
      status: PositionStatus.CLOSED,
      closePrice: 51000,
      closedAt: '2026-01-06T00:00:00.000Z',
      closeReason: PositionCloseReason.STRATEGY,
      closeTransactionValue: 510,
      transaction: 10,
    });
  });

  it('answers null, not a missing field, for values the entity leaves undefined', () => {
    const unset = loadedPosition({
      closePrice: undefined,
      closedAt: undefined,
      closeReason: undefined,
      openTransactionValue: undefined,
      closeTransactionValue: undefined,
      rules: undefined,
    });

    expect(JSON.parse(JSON.stringify(toPositionResponse(unset)))).toMatchObject({
      closePrice: null,
      closedAt: null,
      closeReason: null,
      openTransactionValue: null,
      closeTransactionValue: null,
      rules: null,
    });
  });

  it('lets no field outside the contract through', () => {
    const position = toPositionResponse(loadedPosition());

    expect(Object.keys(position).sort()).toEqual([
      'closePrice',
      'closeReason',
      'closeTransactionValue',
      'closedAt',
      'entryPrice',
      'id',
      'openTransactionValue',
      'openedAt',
      'quantity',
      'robot',
      'rules',
      'status',
      'symbol',
      'transaction',
      'type',
    ]);
    expect(Object.keys(position.robot).sort()).toEqual(['id', 'name']);

    const sent = JSON.stringify(position);
    expect(sent).not.toContain('api-key');
    expect(sent).not.toContain('api-secret');
    expect(sent).not.toContain('owner@example.com');
    expect(sent).not.toContain('owner-password-hash');
    expect(sent).not.toContain('user-1');
    expect(sent).not.toContain('account-1');
    expect(sent).not.toContain('funds-1');
    expect(sent).not.toContain('robot-hash');
  });
});
