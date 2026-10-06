// Register Postgres migrations here.
//
// IMPORTANT:
// This repo uses Nest's webpack build. File-glob migration discovery ("__dirname + '/migrations/*{.ts,.js}'")
// is unreliable under webpack bundling.
//
// So we export an explicit list of migration classes. When you create a migration,
// import it here and add it to POSTGRES_MIGRATIONS.

import { InitAccount1769472000000 } from './1769472000000-InitAccount';
import { InitRobotsPositions1769990400000 } from './1769990400000-InitRobotsPositions';
import { InitUser1770000000000 } from './1770000000000-InitUser';

export const POSTGRES_MIGRATIONS = [
  InitAccount1769472000000,
  InitRobotsPositions1769990400000,
  InitUser1770000000000,
] as const;
