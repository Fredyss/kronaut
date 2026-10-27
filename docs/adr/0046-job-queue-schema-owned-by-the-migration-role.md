# ADR-0046: Job queue schema owned by the migration role

- **Status:** Accepted
- **Date:** 2026-10-22
- **Deciders:** Frederik Schlentc
- **Area:** Tenancy & data
- **Spec:** [Stack](../architecture/01-stack.md), [Publishing pipeline](../architecture/05-publishing-pipeline.md), [Operations](../architecture/11-operations.md)

## Context

graphile-worker installs and upgrades its own `graphile_worker` schema. Left to itself it would do that from the worker, which would need `CREATE` on the database as `kronaut_app`. ADR-0044 keeps DDL away from the app role.

## Decision

**The migration role installs and upgrades `graphile_worker` as part of every migrate run (`installJobQueue`), right after the Kronaut migrations.** It then grants `kronaut_app`:

- `USAGE` on the schema;
- `SELECT`, `INSERT`, `UPDATE`, `DELETE` on its tables, `USAGE`, `SELECT`, `UPDATE` on its sequences and `EXECUTE` on its functions;
- a permissive policy on each table where graphile-worker enables RLS, because those tables have no policy of their own.

The grants are re-applied on every run, so an upgrade that adds tables stays reachable. `kronaut_app` gets no `CREATE` on the schema or the database. A worker started against an out-of-date queue schema fails on its own migration attempt instead of upgrading it.

Queue rows are not split by tenant. Payloads carry only `(workspace_id, id)`, and the job re-reads everything inside `withTenant()` (ADR-0048's rule for sweeps). The tenant catalog tests (TEN-04 to TEN-07) cover the `public` schema only.

## Options considered

- **Chosen:** the decision above.
- Rejected: `kronaut_app` owns `graphile_worker`. Simplest, but it gives the app role DDL, which ADR-0044 exists to prevent.

## Consequences

- Upgrading graphile-worker is a migrate step, not a worker restart.
- Job payloads stay ids-only; content in a payload would bypass RLS.
- Revisit when: graphile-worker changes how it installs its schema, or the queue moves out of Postgres.
