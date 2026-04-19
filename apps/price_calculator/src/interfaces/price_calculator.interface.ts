export interface IInstance extends Record<string, string> {
  name: string;
  port: string;
  provider: string;
  symbols: string;
  recalculate: string;
}

export interface IUpdateInstancePayload extends Record<string, string | undefined> {
  provider?: string;
  symbols?: string;
  recalculate?: string;
}
