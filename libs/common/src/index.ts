// TEMPORARY compatibility layer (ADR 001). Re-exports the new libraries so apps keep importing
// from @app/common while code moves. Removed in task 001 step 8.
export * from '@app/contracts';
export * from './config';
export * from './database';
export * from './auth';
export * from './redis';
export * from './clients';
export * from './models';
export * from './decorators';
export * from './libs';
export * from './kafka';
export * from './interceptors';
export * from './tcp';
export * from './logger';
export * from './filters';
export * from './health';
export * from './throttler';
export * from './middleware';
export * from './metrics';
