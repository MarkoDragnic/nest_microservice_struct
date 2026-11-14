// What the robots service asks pg_write to store when a robot is created.
export interface RobotCreateRequest {
  owner: { id: string };
  account: { id: string };
  hash: string;
  name: string;
  fsymbol: string;
  type: string;
  assets: string;
  active: boolean;
  funds: {
    initial: number;
    value: number;
    base: string;
    dynamic: boolean;
    partial: string;
    size: number;
  };
  instrument: {
    name: string;
    symbol: string;
  };
}
