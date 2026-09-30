import { ProviderId } from './normalized.types';

export type BinanceData = {
  u: number;
  s: string;
  b: string;
  B: string;
  a: string;
  A: string;
};

export type ProviderState = {
  providerId: ProviderId;
  symbols: Set<string>;
};

export type WsCallbackType = {
  error: boolean;
  message: { symbols: string[] };
};

export interface AssetProvider {
  getType(): string;
  disconnect(): void;
  isConnected(): boolean;
  subscribe(symbols: string[], callback?: (result: WsCallbackType) => void): Promise<void> | void;
  unsubscribe(symbols: string[], callback?: (result: WsCallbackType) => void): Promise<void> | void;
}

export interface AssignmentCommand {
  type: 'subscribe' | 'unsubscribe';
  symbol: string;
}
