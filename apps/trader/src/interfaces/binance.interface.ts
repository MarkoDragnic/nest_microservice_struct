import type { BinanceOrderSide, BinanceOrderType } from '../types/binance.types';

export interface IBinanceTradeSignal {
  symbol: string; // BTCUSDT
  side: BinanceOrderSide;
  type: BinanceOrderType;
  quantity: string;
  // required for LIMIT, STOP_LOSS_LIMIT, TAKE_PROFIT_LIMIT
  price?: string;
}

export interface IBinanceCredentials {
  apiKey: string;
  apiSecret: string;
  baseUrl: string;
  endpoint: string;
}
