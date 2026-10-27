# ADR-0050: Bluesky client signing keys (revised)

- **Status:** Accepted
- **Date:** 2026-10-23
- **Deciders:** Frederik Schlentc
- **Area:** Providers & product
- **Spec:** [Provider contract](../architecture/03-provider-contract.md), [Data model](../architecture/04-data-model.md), [Security](../architecture/06-security.md)

Supersedes ADR-0047.

## Context

ADR-0035 makes Bluesky a confidential OAuth client using `private_key_jwt`. ADR-0047 stored the client signing keys in `provider_app_keys` and rotated them with `next → active → retiring → deleted`, where a retiring key "no longer signs".

The atproto OAuth spec, re-verified on 2026-10-23, binds every session to the client key that started it. Every refresh must be signed with that same key, and removing the key from the client metadata revokes the session. Rotating as ADR-0047 describes would break every existing Bluesky session at its first refresh after the rotation.

## Decision

**Keep `provider_app_keys` and its envelope, but bind each credential to its key and let retiring keys keep signing for their own sessions.**

- **Storage:** as in ADR-0047.
  - The table is global, one row per key of a `provider_apps` row: `kid`, `alg` (ES256 only), the public JWK, and the private key under the ADR-0021 envelope.
  - The AAD is `aad_v|id|provider_app_id|provider`.
  - `kronaut_app` may only read the table; creating, activating and deleting keys is operator-only, through the CLI.
- **Binding:** `account_credentials` gains a nullable `client_key_id uuid`, referencing `provider_app_keys` with `ON DELETE RESTRICT`.
  - Connect sets it to the key that signed the PAR request.
  - Refresh signs with that key and never with another.
  - The database therefore refuses to delete a key that any credential still uses.
- **Status:**
  - `next`: published, not used to sign.
  - `active`: signs new sessions; at most one per app.
  - `retiring`: still published, and still signs refreshes for the sessions bound to it, but never starts new ones.
- **Rotation:**
  1. Insert a `next` key and wait for metadata caches to pick it up.
  2. Activate it; the old key becomes `retiring`.
  3. Delete the retiring key only when no credential references it. Its sessions end when users reconnect (rebinding them to the active key), when they are disconnected, or when the operator chooses to revoke them.
- **Credential contents:** per-session DPoP keys are still not app keys. Each is stored inside its account's encrypted credential and must differ from the client key.
- **Scope:** Phase 0 requests `atproto transition:generic`. That's what bsky.social's `scopes_supported` advertises today. Granular `repo:`/`blob:` scopes replace it when bsky.social lists them; check the returned `scope` either way.

## Options considered

- **Chosen:** the decision above.
- Rejected: ADR-0047 as written. It breaks every session on rotation.
- Rejected: storing the `kid` only inside the encrypted credential. It works for signing, but nothing can tell whether a retiring key is still in use, so deletion becomes guesswork.
- Rejected: never rotating. A leaked key would then have no recovery short of every user reconnecting.

## Consequences

- Rotation needs no restart and breaks no session. A compromised key is revoked by deleting its credentials' sessions (forcing reconnects) and then the key.
- A schema change: one nullable column plus its foreign key, done as an expand-only migration, with `v1.sql` updated to match.
- Revisit when: bsky.social accepts granular scopes, another provider needs asymmetric client keys, or Bluesky requires a different algorithm.
