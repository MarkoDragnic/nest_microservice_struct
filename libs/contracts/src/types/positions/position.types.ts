export enum PositionStatus {
  OPEN = 'open',
  CLOSED = 'closed',
}

export enum PositionCloseReason {
  'EXIT_ORDER' = 'exit order triggered (Stop lose, Take profit)',
  MANUAL = 'manual',
  STRATEGY = 'strategy',
  UNKNOWN = 'unknown',
}
