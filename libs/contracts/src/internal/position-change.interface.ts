// What positions reads from pg_write after opening or closing a position.
// Timestamps are ISO strings: dates arrive as strings over TCP.
export interface PositionChange {
  id: string;
  symbol: string;
  entryPrice: number;
  quantity: number;
  openedAt: string;
  closePrice: number | null;
  closedAt: string | null;
  transaction: number;
}
