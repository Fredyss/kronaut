# ADR-0010: Per-destination content hash and canonicalisation

- **Status:** Accepted
- **Date:** 2026-10-21
- **Deciders:** Frederik Schlentc
- **Area:** Content & approval
- **Spec:** [Security](../architecture/06-security.md)

## Context

Stable across deploys and languages; removing one destination voids nothing. Floats, key order, NFD input (č/š/ž from macOS) and re-encodes would all make hashes unstable.

## Decision

**Per-destination content hash**: `sha256(JCS({v, provider, account, publish_type, delivery_mode, language, items[{role, canon(doc), media[{sha256, transform, alt(NFC), ai}]}], settings(parsed)}))`

Canonicalisation rules: `Node.fromJSON(schema_vN).toJSON()`, NFC on every text node, `\r\n → \n`, no trimming, **integers only** (crop per-mille, durations in ms). Media are identified by the master sha256. Hashes are **never recomputed from stored JSONB text**

## Options considered

- **Chosen:** the decision above.
- Rejected: whole-post hash
- Rejected: hashing serializer output
- Rejected: float crops
- Rejected: asset-id identity

## Consequences

- Revisit when: a new hash version is needed (`content_hash_v`)
