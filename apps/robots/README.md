# Robots

A robot is the core user-facing concept in the platform. It ties together a trading symbol, an exchange account, and a set of indicator-based rules that define when the trader should open and close a position.

This service handles the full lifecycle of robot configuration — creation, indicator updates, and ownership checks. Creation routes through `pg_write` over TCP and returns the persisted robot. The more interesting parts are how the service handles indicator changes and how it prevents duplicate robots.

## Indicator management

When a user updates the indicator rules on a robot, the service does not blindly overwrite the Redis indicator registry. Instead it computes a diff between the old indicator set and the new one and writes only the additions and removals. This matters because the registry is what `price_calculator` and `indicators` use to decide which symbols and calculations to maintain. An unnecessary write would cause those services to tear down and rebuild subscriptions that were already correct.

## Deduplication

Before persisting a new robot, the service hashes the full configuration using a deterministic object hasher (`node-object-hash` with sort normalisation). The hash is stored as a unique constraint in the database. If the same configuration is submitted twice, the write service returns a `409 Conflict` rather than inserting a duplicate row. From the caller's perspective it is a clean error rather than a silent duplicate.
