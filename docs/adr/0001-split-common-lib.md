# 001. Split common lib

Status: Accepted
Date: 2026-09-30

## Context

When I started this project I put all shared code in `libs/common`. It was fast to work with, but now it's a problem.

Every service imports from `@app/common`, and every Dockerfile copies the whole `libs` folder. So if I change one DTO, all 13 images rebuild. CI does the same, it builds every app on every push.

While going through the imports I found two more things I don't like:

- Services that never talk to Postgres use the TypeORM entities as message types. `trader` uses `Robot`, `Position`, `Account` and `Funds`. `gateway`, `auth` and `accounts` do the same with `User` and `Account`. If I change a column, I change the contract for services that don't own that data.
- `index.ts` in common exports everything. A service like `positions` only needs a few DTOs, but it still loads TypeORM, Mongoose, Kafka and Redis at startup.

Only `pg_read` and `pg_write` need Postgres. Only `history_provider`, `notifications` and `price_calculator` need Mongo.

## Decision

Split common into smaller libs:

- `contracts`: DTOs, types, TCP patterns, Kafka topics and event types
- `core`: logger, config, filters, guards, metrics, health
- `messaging`: TCP clients, Kafka, DLQ
- `redis`: Redis client and key services, throttler
- `postgres`: entities, repositories, migrations
- `mongo`: Mongo repositories, candle storage

Services import only what they use. No more single barrel.

The JWT and robot ownership guards only serve gateway, so they move into gateway instead of a shared lib. Code with one user doesn't need to be shared.

Entities stay inside `pg_read` and `pg_write`. Everyone else gets contract types, and the data services map entities to them before responding. I'll add a lint rule so nobody (me included) imports `postgres` from somewhere else by accident.

Dockerfiles copy only the libs each service needs, and CI builds only what changed.

## Other options

**Only move the DB code out.** This was my first idea. It fixes the heaviest part, but entities would still be used as contracts and the barrel would still load Kafka and Redis everywhere. So I'm doing it as the first step, not the whole fix.

**Nx or Turborepo.** Would give me the dependency graph and affected builds for free. For 13 services it's more tooling than I need right now. If keeping the dependency map in sync by hand becomes annoying, I'll come back to this.

**Separate npm packages.** Too much overhead for one repo.

## Consequences

Changes in one lib only rebuild the services that use it. Services start with less loaded. Contracts don't depend on the database schema anymore.

The downside is more libs to manage, and the map of which service uses which lib now lives in Dockerfiles, CI and the lint rule. Those can get out of sync. I'll live with that for now.

Mapping entities to contract types adds some boilerplate in the data services.

This doesn't fix everything. `pg_read` and `pg_write` still share the same tables, that's the next ADR. `history_provider` and `price_calculator` also share the candle collection, which I'll deal with separately.

## Status on 2026-11-13

Done:

- `libs/common` is gone. The six libs from the decision exist: `contracts`, `core`, `messaging`, `redis`, `postgres` and `mongo`.
- Entities live only in `libs/postgres`, and only `pg_read` and `pg_write` import it.
- The JWT and robot ownership guards are in `apps/gateway/src/guards`.
- Internal service-to-service contracts are in `@app/contracts/internal`. They are plain interfaces shaped by the consumer, with only the fields it reads. The mappers in `libs/postgres` build them from entities field by field, and each mapper has a leak test that fails if a field outside the contract gets through.

Still open:

- Imports between libs. Apps import libs only through the root barrels and `@app/contracts/internal`. Inside the libs I still have deep imports of another lib (like `@app/core/logger`), and `contracts` and `redis` import through their own alias in some files. I need to rewrite these.
- ESLint boundary rules. Nothing in `eslint.config.mjs` stops a service from importing `@app/postgres` or a deep path yet. Today it holds only because I checked.
- Per-service Dockerfiles. All 13 Dockerfiles still copy the whole `libs` folder.
- CI path filters. CI still builds all 13 apps and all images on every run.
