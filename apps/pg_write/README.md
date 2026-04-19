# pg_write

The write side of the database layer. Every mutation in the system — creating users, accounts, robots, positions, funds — is routed through this service over TCP.

## Migrations

This service runs pending TypeORM migrations on startup before accepting any TCP connections. That sequencing guarantee means the schema is always current by the time any other service attempts a write. There is no manual migration step and no risk of a service writing to a stale schema after a deploy.

## Conflict detection

Database-level constraint violations are caught here and converted into typed NestJS exceptions before the response leaves the service. A duplicate email on registration becomes a `409 Conflict` rather than a raw PostgreSQL error propagating back to the gateway. Callers receive a consistent, structured error they can handle without parsing database messages.

## Transactional writes

Operations that must be atomic — opening a position and reserving funds, or closing a position and releasing them — are exposed as dedicated TCP events that wrap both writes in a single TypeORM transaction. The caller fires one event and either everything commits or nothing does. There is no partial state left in the database if something fails mid-operation.
