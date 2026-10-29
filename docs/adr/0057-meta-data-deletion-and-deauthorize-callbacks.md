# ADR-0057: Meta data deletion and deauthorize callbacks

- **Status:** Accepted
- **Date:** 2026-10-29
- **Deciders:** Frederik Schlentc
- **Area:** Providers, security, operations
- **Spec:** [Security](../architecture/06-security.md), [Operations](../architecture/11-operations.md), [Data model](../architecture/04-data-model.md)

## Context

Phase 2 starts with the Meta data-deletion callback. Meta App Review asks every app for either a data deletion callback or an instructions URL. The Facebook, Instagram and Threads app settings also take a deauthorize callback URL.

Meta documents only the generic callback (M27, checked 2026-10-29):
- It's an HTTPS `POST` whose form body holds a `signed_request`.
- The `signed_request` is `<base64url signature>.<base64url JSON payload>`, signed with HMAC-SHA256 over the encoded payload using the app secret.
- The payload carries `algorithm`, `issued_at`, `expires` and an app-scoped `user_id`.
- The answer is `{url, confirmation_code}`. The `url` shows a human-readable status, including the reason for any refusal.

The Instagram and Threads pages say only that Meta "pings" these URLs, so Kronaut assumes the same format, keyed by each product's own app secret.

Kronaut stores Facebook Page ids, Instagram professional account ids and Threads user ids as `provider_account_id`. The app-scoped id of the person who authorized is stored nowhere today.

AR-12 (architecture hardening review) asks every unauthenticated endpoint to define its ingress, verification, replay store, body and rate limits, logging and resolver.

## Decision

**Public routes**, all in the committed public-route snapshot, `provider ∈ {facebook, instagram, threads}`:
- `POST /v1/meta/:provider/deletion` and `POST /v1/meta/:provider/deauthorize` take a form body with one field, `signed_request`.
  - The body limit is 8 KiB. The signature check is the gate: an unsigned request costs one HMAC and is refused before any write. Kronaut has no per-IP limiter yet; when the public API adds one (Phase 2 integrations), these routes join it at 30 per minute.
- `GET /v1/meta/deletion/:code` answers with a `text/plain` status in en, sk or cs, chosen from `Accept-Language`. It has no HTML, so nothing user-supplied is ever rendered as markup.
- These paths, and only these, become the third exemption from the Cloudflare Access gate (`/v1/meta/*`). The self-hosting guide adds the bypass policy.

**Verification:**
- Split on the first `.`, then base64url-decode the signature.
- Compute HMAC-SHA256 over the encoded payload with the provider's active app secret, unsealed through the keyring. Compare in constant time.
- The payload must parse as JSON, have `algorithm` equal to `HMAC-SHA256` ignoring case, and carry a non-empty string `user_id`.
- Anything else gets a `400` with a fixed body.
- Neither the `signed_request` nor the `user_id` is ever logged, returned or written to the audit trail.

**Storage:** a new global table `meta_lifecycle_requests` (ADR-0056).
- Columns:
  - `id`, `provider`, `kind` (`deletion | deauthorize`), `received_at`;
  - `request_hash` (SHA-256 of the `signed_request`, unique);
  - `subject_hmac`, an HMAC-SHA256 of `user_id` keyed by a key derived from `KRONAUT_SECRET`;
  - `subject_id`, the raw id, set to null once processed;
  - `confirmation_code`, for deletions only: 20 base32 characters from `crypto.randomBytes`, unique;
  - `completed_at` and `matched`.
- `CHECK (completed_at IS NULL OR subject_id IS NULL)` keeps a raw id from outliving its job.
- **Replay:** `(provider, kind, request_hash)` is unique. The same `signed_request` on the same route returns the stored row and its code, so replays are idempotent and need no freshness window. The same request sent to both deletion and deauthorize counts as two requests.
- **Retention:** rows are purged 180 days after completion by `purge_instance_retention`.

**Matching:** `social_accounts` gains `provider_subject_id text`, the app-scoped id of the person who authorized.
- Facebook sets it from `GET /me`, Instagram from the app-scoped `id` of `/me`, and Threads from the `/me` `id`, on every connect and reconnect.
- Accounts connected earlier have it null until they are reconnected.
- Instagram is also matched on `provider_account_id`, because which id its callback carries is undocumented.

**Processing:** the route inserts the row and enqueues the `meta_lifecycle` job, whose payload is the request id only (ADR-0046). It then answers at once.
- The job walks `sweep_workspaces`; this is database-local work, so no new definer function is needed. Inside `withTenant()` it locks the matching `social_accounts` rows of that provider.
- **Deletion:**
  - The account goes to `disconnected` with reason `data_deletion_requested`, and its destinations become `blocked/account_disconnected` through the existing disconnect path.
  - Its credentials are deleted at once, with no 30-day grace.
  - `handle`, `display_name`, `profile_url` and `provider_subject_id` are wiped, so the raw Meta id doesn't outlive the request.
  - It writes the audit event `channel.data_deleted`.
  - Posts and their history stay, because they are the workspace's records, not Meta's data.
- **Deauthorize:** the account goes to `needs_reauth` with reason `deauthorized`, and its credentials are deleted. The profile fields stay.
- **Finish:** the job sets `matched`, `completed_at` and `subject_id = null`.

**Status page:**
- While the job runs, it reads "received".
- Then it reads "completed", saying how many channels were deleted.
- With no match, it says Kronaut holds no data for that Meta account. If the person still sees a channel, the workspace owner can disconnect it, or reconnect it once so it can be matched.

## Options considered

- **Chosen:** the decision above.
- Rejected: a deletion-instructions URL only. It satisfies App Review, but leaves tokens behind after a user removes the app.
- Rejected: matching in the request handler. It would walk every workspace before Meta gets an answer, and couple the endpoint's latency to the instance size.
- Rejected: a new definer function that looks up accounts by subject. The work is database-local, so `sweep_workspaces` already allows it, and it avoids a new cross-tenant read path.
- Rejected: keeping the raw `user_id` for the status page. A keyed HMAC is enough for idempotency, and it can't be reversed if leaked.
- Rejected: deleting post history for the matched channel. It belongs to the workspace owner, and deleting it can't be undone (the owner's choice, 2026-10-29).

## Consequences

- The Facebook, Instagram and Threads app settings get the three callback URLs (11-operations), and App Review has a working callback.
- The Access gate gains a third exemption, `/v1/meta/*`.
- A deletion request for an account connected before this release matches nothing until that account is reconnected.
- Revisit when: Meta documents the Instagram or Threads payloads differently, or a provider requires proof of deletion.
