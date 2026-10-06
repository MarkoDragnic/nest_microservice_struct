// TEMPORARY compatibility layer (ADR 001). Re-exports the new libraries so apps keep importing
// from @app/common while code moves. Removed in task 001 step 8.
export * from '@app/contracts';
export * from '@app/core';
export * from '@app/messaging';
export * from '@app/redis';
export * from '@app/mongo';
export * from '@app/postgres';
