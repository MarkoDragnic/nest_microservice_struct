// TEMPORARY compatibility layer (ADR 001). Re-exports the new libraries so apps keep importing
// from @app/common while code moves. Removed in task 001 step 8.
export * from '@app/contracts';
export * from '@app/core';
export * from '@app/mongo';
export * from './database';
export * from './redis';
export * from './clients';
export * from './models';
export * from './kafka';
export * from './throttler';
