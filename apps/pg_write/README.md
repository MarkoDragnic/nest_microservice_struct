# pg_write

The write side of the database layer. Every mutation in the system (creating users, accounts, robots, positions, funds) is routed through this service over TCP.

## Migrations

With `POSTGRES_MIGRATIONS_RUN=true` this service runs pending TypeORM migrations on startup, before it accepts any TCP connections. Then the schema is current by the time any other service attempts a write. `docker-compose.full.yml` sets the flag for `pg_write`. In `env/postgres.env.example` it is `false`, and migrations are run by hand with `npm run migration:run`.

## Conflict detection

Database-level constraint violations are caught here and converted into typed NestJS exceptions before the response leaves the service. A duplicate email on registration becomes a `409 Conflict` rather than a raw PostgreSQL error propagating back to the gateway. Callers receive a consistent, structured error they can handle without parsing database messages.

## Transactional writes

Operations that must be atomic (opening a position and reserving funds, or closing a position and releasing them) are exposed as dedicated TCP events that wrap both writes in a single TypeORM transaction. The caller fires one event and either everything commits or nothing does. There is no partial state left in the database if something fails mid-operation.
