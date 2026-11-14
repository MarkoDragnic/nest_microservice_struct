# pg_read

The read side of the database layer. The queries of the other services (user lookups, robot queries, position reads) are routed through this service over TCP.

## Why a dedicated read service

Reads and writes go through two separate services, `pg_read` and `pg_write`. Both use the same tables and entities, so the split is in the access path, not in the data model. The query logic for every entity lives in one place rather than being duplicated across whichever service happens to need it at the time. Auth fetches users through here. The trader fetches robots and open positions through here. The gateway lists robots and positions through here. When a query returns unexpected data there is a single place to look.

The read service can also be scaled independently of the write side. Read traffic is typically higher and more latency-sensitive than write traffic, so having a separate deployment unit gives more flexibility at runtime.

## Behaviour

The handlers of this service make no writes. If a query returns nothing, it returns an empty result or throws a typed `NotFoundException`. It does not raise unstructured errors or trigger side effects. Callers can rely on the response shape being consistent regardless of whether data was found.

## Paginated queries

The service supports paginated list operations via `findPaginated()` on the abstract repository. The `ROBOT_FIND_PAGINATED` and `POSITION_FIND_PAGINATED` message patterns accept `userId`, `page`, and `limit`, and return a `PaginatedResponseDto` containing `data`, `total`, `page`, `limit`, and `totalPages`. This uses TypeORM's `findAndCount` with `skip`/`take` for efficient offset-based pagination.
