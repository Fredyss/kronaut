# ADR-0047: Bluesky client signing keys

- **Status:** Superseded by ADR-0050
- **Date:** 2026-10-22
- **Deciders:** Frederik Schlentc
- **Area:** Providers & product
- **Spec:** [Provider contract](../architecture/03-provider-contract.md), [Data model](../architecture/04-data-model.md), [Security](../architecture/06-security.md)

## Context

ADR-0035 makes Bluesky a confidential OAuth client using `private_key_jwt`. The client signs each assertion with a private key and publishes the public half in its client-metadata document. `provider_apps` only stores a symmetric `client_secret`, so the key had nowhere to live and no way to rotate.

## Decision

**Client signing keys live in a global table, `provider_app_keys`, one row per key of a `provider_apps` row.** Each row holds a `kid`, the `alg` (ES256 only in v1), the public JWK, the private key under the ADR-0021 envelope (`ciphertext`, `nonce`, `wrapped_dek`, `kek_version`, `aad_v`) and a `status`:

- `next`: published in the JWKS, not used to sign;
- `active`: signs assertions; at most one per app;
- `retiring`: still published, no longer signs.

Rotation: insert a `next` key, wait for metadata caches to pick it up, activate it (the old key becomes `retiring`), then delete the retiring row once no assertion signed with it can still be accepted. The client-metadata document publishes every key of the app. The AAD for the private key is `aad_v|id|provider_app_id|provider`, where `id` is the `provider_app_keys` row id (as ADR-0021's `credential_id` is the credential's row id), not the `kid`.

`kronaut_app` may only read the table, to sign assertions and serve the JWKS. Creating, activating and deleting keys is operator-only, through the CLI, like registering an instance-wide provider app. Bluesky's `provider_apps` row has no client secret.

Per-session DPoP keys are not app keys. Each one is stored inside its account's encrypted credential, and it must differ from the client key.

## Options considered

- **Chosen:** the decision above.
- Rejected: the key in a secrets file like the KEK. No schema change, but rotation means a file swap and a restart, and the key sits apart from every other provider secret.
- Rejected: Mastodon in place of Bluesky for Phase 0. It postpones the problem.

## Consequences

- Key rotation needs no restart and no downtime.
- The OAuth connect flow (PAR, callback, public metadata URL) still needs its own ADR before the Bluesky provider ships.
- Revisit when: another provider needs asymmetric client keys, or Bluesky requires a different algorithm.
