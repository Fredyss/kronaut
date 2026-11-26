# ADR-0070: API key management and rate limits for our own API

- **Status:** Accepted
- **Date:** 2026-11-26
- **Deciders:** Frederik Schlentc
- **Area:** Identity, agents & security
- **Spec:** [Security](../architecture/06-security.md), [Operations](../architecture/11-operations.md), [Data model](../architecture/04-data-model.md)
- **Supersedes in part:** [ADR-0040](0040-idempotency-keys-for-every-write.md) (the route that creates an API key)

## Context

ADR-0013, ADR-0014 and ADR-0027 fix the grant model: `access_grants` and `grant_tokens`, `kro_<key_id>_<secret>` looked up by HMAC, scopes from a frozen allowlist, and an explicit resource scope. Bearer authentication already works, but nothing creates or revokes a grant except test fixtures. The operations chapter asks for per-grant and per-IP buckets in `rate_buckets`, and ADR-0057 says the Meta callbacks join a 30-per-minute per-IP limiter once one exists. Neither gives the routes, the token's shape, the bucket sizes or where the client address comes from.

## Decision

**Management routes** under `/v1/workspaces/:workspaceId/grants`: `GET` lists, `POST` creates, `POST /:grantId/revoke` revokes.
- Session only, action `grants:manage`, so owners and admins only. An API key gets 401, like every session-only route.
- The member must have workspace-wide access. `authorize()` already refuses a restricted member a write with no scope units (`out_of_scope`), so a restricted admin can't mint a key that sees the whole workspace.
- Create makes `kind = 'api_key'` only. `oauth` and `internal_ai` grants come with their own flows (Phase 3, AI).

**Create input:**
- `name`: NFC, trimmed, 1 to 120 characters.
- `scopes`: at least one. A never-grantable action is `422 never_grantable`, anything else outside the 15 grantable scopes `422 unknown_scope`. The DB CHECK stays the last line. They are stored deduplicated in vocabulary order.
- `resourceScope`: `workspace` (default) or `restricted`. A restricted key takes `access` with up to 100 brand, location and channel ids each. Each must exist in the workspace (`422 not_found`); empty lists mean the key reaches nothing (ADR-0014). `access` on a workspace-wide key is `422 not_restricted`.
- `expiresAt`: optional, must lie ahead (`422 in_past`). It is stored on the grant; the token row has no expiry of its own.
- `rateLimitPerMinute`: optional, 1 to 6000 (the column's CHECK).

**Token:**
- `kro_` + a 16-character hex key id (8 random bytes) + `_` + `randomToken()`'s 32 random bytes in base64url. The server stores one `grant_tokens` row of kind `key` with the HMAC-SHA256 under the `grant-token/v1` purpose key, `hash_key_version = 1`.
- **Shown once:** only the create response holds the token. Create runs outside `idempotency_keys`, because a stored response would keep the plaintext for 24 hours; a retried create makes a second key. Revoke keeps its idempotency key.
- The listing shows `tokenPrefix` (`kro_<key_id>`) so a person can tell keys apart. The key id alone authenticates nothing.

**Listing:** every grant of the workspace, newest first, revoked and expired ones included, each with a derived `status` (`active | expired | revoked`).

**Revoke:** one transaction sets `revoked_at` and `revoked_by` on the grant and `revoked_at` on all its live tokens. The lookup already refuses a revoked grant, so the next request fails. Revoking a revoked grant changes nothing and writes no second event. Grant rows are never deleted: audit events, series and evergreen posts point at them.

**Audit:** `grant.created` with `kind`, `scopes`, `resource_scope`, the number of access rows, whether it expires and the rate limit; `grant.revoked` with `kind`. Never the token, its hash or the name.

**Rate limits:**
- One token bucket per key in `rate_buckets`: `endpoint:grant:<grant uuid>`, capacity and refill of `rate_limit_per_min` per minute, or 300 when unset. Every request bound to a key counts, including ones `authorize()` then refuses.
- One token bucket per client address and route family, `endpoint:ip:<family>:<id>`, 30 per minute each: `auth` (login, password set), `oauth` (the OAuth callback and the provider documents), `meta` (the Meta callbacks and their status page, ADR-0057's 30-per-minute limiter) and `public` for any public route added later. `/healthz` and `/readyz` are left out, since they are probes from inside the network.
- Sessions are not limited. A request whose credentials fail is not counted; a token is 256 random bits, so guessing it is not the threat.
- The limiter runs in the route pipeline right after the principal is bound, before the body is parsed or the handler runs. Beyond the limit the answer is `429 rate_limited` in the standard error body, with `Retry-After` in whole seconds (at least 1).
- The keys use the existing `endpoint:` prefix of the `rate_buckets` CHECK, so no migration is needed. The 30-day idle purge applies.
- Bucket sizes are constants in code: a tuning value, not instance configuration.

**Client address:**
- With the Cloudflare Access gate configured (`ACCESS_AUD`), the stack's only ingress is Cloudflare Tunnel, so the server takes `CF-Connecting-IP`, which Cloudflare overwrites at its edge. Without the gate it takes the socket address, but only a public one: a private, loopback, link-local or other non-public socket address is a proxy in front of the app (cloudflared without Access, a reverse proxy), and keying on it would let any one client exhaust the bucket for everyone. Such a request gets no per-IP limit, and the server logs a warning at startup while `ACCESS_AUD` is unset. `X-Forwarded-For` is never read.
- A malformed header falls back to the socket address. IPv4-mapped IPv6 counts as IPv4, and any other IPv6 address counts by its /64, since one client easily holds a whole /64.
- The address is never stored: the bucket id is the first 128 bits of an HMAC-SHA256 under the `rate-ip/v1` purpose key.
- A request with no socket address, which only an in-process call has, gets no per-IP bucket either.

## Options considered

- **Chosen:** the decision above.
- Rejected: keeping create idempotent and stripping the token from the stored response. A replay would answer without the token the first call already lost (as in ADR-0069).
- Rejected: a fixed window, like `takeWindowQuota`. It allows twice the limit across a window boundary; the schema already has a `token_bucket` kind.
- Rejected: one per-IP bucket for all public routes. It was the first draft; review showed one family starving another: an office NAT exhausting login blocks its own channel connects, and a burst from one Meta server address would turn a deletion callback into a 429, a compliance risk. Per family keeps each at ADR-0057's 30 a minute.
- Rejected: one per-IP bucket per route. It multiplies a client's budget by the number of public routes without separating anything the families don't.
- Rejected: trusting `X-Forwarded-For` or a configurable header. Any client can send it, and the documented stack has exactly one proxy (RL-01).
- Rejected: raw addresses in bucket keys. They would sit in a global table for 30 days.
- Rejected: letting a restricted admin create keys limited to their own scope. It needs a subset check against the member's scope at create time and on every later change of it; refusing is fail-closed.

## Consequences

- Each authenticated API-key request and each public request now opens one short transaction on `rate_buckets`, including the unsigned Meta callbacks that ADR-0057's secret cache kept out of the database.
- A busy key serializes on its bucket row; at the default 300 a minute that is a few short row locks a second.
- With the gate off behind a proxy, public routes have no per-IP limit at all; the startup warning says so.
- A sponsor who is later restricted keeps sponsoring workspace-wide keys: ADR-0013 intersects the sponsor's role, not their resource scope.
- Revisit when: Phase 3 adds OAuth clients (`kind = 'oauth'`), hosted mode needs per-plan limits, or the instance runs behind another proxy.
