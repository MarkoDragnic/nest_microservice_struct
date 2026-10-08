import type { IIndicatorsConfig } from '../interfaces/indicators-config.interface';

// What the robots service reads about a robot it manages. No owner contact fields.
export interface ManagedRobot {
  fsymbol: string;
  indicators?: IIndicatorsConfig;
  owner: { id: string };
}
