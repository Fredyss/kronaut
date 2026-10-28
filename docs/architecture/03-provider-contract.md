# Provider plugin contract

One folder per provider. `manifest.ts` is declarative and browser-safe; `runtime.ts` is server-only. A codegen step globs manifests into the registries, so adding a provider touches no other file. Contract: ADR-0032, ADR-0036.

**Manifest fields**

- **Identity and auth**
  - `id`
  - `apiVersion`: pinned and dated, plus its sunset date. LinkedIn sends it as the mandatory `Linkedin-Version` header; each version lives at least 1 year.
  - `availability{state, caveatKey}`
  - `auth`: kind, plus `refresh` (one of `none | self_refresh | reusable | rotating | single_use`), access/refresh TTLs and `warnLead`.
  - `auth.instanceScoped`: the provider's apps are per server (Mastodon). The server registers one on demand through `registerApp` at connect start (ADR-0051); the conformance kit fails an instance-scoped provider without `registerApp`.
- **Content limits**
  - Text limits and counting strategy: `x-weighted` (twitter-text), `mastodon` (graphemes, each link as the limit's `urlWeight`, a remote mention as its username part), `threads` (graphemes, an emoji or flag cluster as its UTF-8 bytes), `graphemes`, `utf16`, or `utf8-bytes`.
    - **Composite limits** are allowed: Bluesky checks 300 graphemes *and* 3,000 bytes; YouTube checks chars *and* bytes.
    - `maxLinks`: the most **unique** links one item's text may hold (Threads: 5). `countLinks()` counts each distinct `http(s)://` URL and each bare host such as `www.example.com`, matched as written; it errs towards over-counting. Over the limit, `validate()` reports `too_many_links`.
    - Limits can be **per instance** (Mastodon reads `/api/v2/instance`). `accountPostType?(postType, capabilities)` returns the post type with an account's stored `capabilities` applied; `validate()` takes those capabilities and uses it at schedule and at claim.
  - Escaping rules: LinkedIn commentary uses little-text backslash escaping.
  - Link, hashtag and mention rules. Bluesky facets use UTF-8 byte offsets, and its link cards are built by the client.
  - Media limits: count, MIME, bytes, duration, aspect ranges, `altText`, `aiLabel` field name.
- **Post types**
  - `postTypes[]`, each with:
    - `delivery api | reminder | unsupported`
    - `steps[{id, effect none|private|public}]`
    - async give-up limits
  - Thread and first-comment support: optional `thread {maxItems, media}` and `comment {text, steps}` ([ADR-0055](../adr/0055-reply-chains-and-first-comment.md)).
- **Settings:** a Zod schema with defaults.
- **Cost:** `cost{model, perPost{usd, linkUsd, asOf, sourceUrl}}`.
- **Verification:** `verify.mode`, one of `idempotency_key | deterministic_id | status_by_ref | list_recent_match | none`.
- **Rate limits:** `rateLimits[{scope account|app|instance, headerParser}]` plus concurrency.
- **Preview:** the archetype.
- **Capabilities:** `analytics`, `delete`.

**Runtime**

- `connect`, `refresh`.
- `registerApp?(ctx, {instanceHost, redirectUri, clientName, website?})` → `{clientId, clientSecret}`: required when `auth.instanceScoped`. The server seals the secret and stores the `provider_apps` row with `instance_host`.
- `ProviderApp.instanceHost` names the server of an instance-scoped app; providers build every URL from it, never from response data.
- `connectFinish` returns a list of accounts (ADR-0053). Single-account providers return one; Facebook returns one per Page the person shared and can create content on.
  - An empty list fails the connect with `no_accounts`.
  - The server saves every returned account in one transaction, each credential with the manifest's `auth.kind`. It never changes accounts the list leaves out.
  - An intermediate token, such as Facebook's long-lived user token, stays inside `connectFinish`; it is never stored or returned.
- Each account `connectFinish` returns may carry `capabilities` (per-account limits, such as a Mastodon server's `/api/v2/instance` configuration); the server stores them in `social_accounts.capabilities`.
- `publish` runs the step list and returns `{remoteId,url} | {pending}`.
- `poll`, `verify?`, `analytics?`.
- `readInstanceCapabilities?(ctx, instanceHost)`: re-reads an instance-scoped provider's server limits. The daily `account_capabilities_refresh` cron stores them for every active account whose `capabilities.fetchedAt` is over 24 h old, one call per host, keeping the old values when a server fails.
- `revoke?(ctx, {app, account, credentials})`: invalidates the stored token at the network. Disconnecting a channel whose runtime has it enqueues a `revoke_credential` job (ids and credential version only, never the token) in the same transaction. The job revokes only while the account is still disconnected and the credential version unchanged; transient failures retry with the queue's backoff, and a refusal is logged and left to the 30-day purge. Mastodon implements it (ADR-0051).
- `PublishItem.language` carries the variant's content language when it has one.

**ctx**

- egress `http`: rate-limited, retry-aware, redacted logs.
- `media.signedUrl()` / `media.stream()`.
- `checkpoint()`, which persists `provider_state` after each step.
- `logger`.
- Providers never touch the DB.

**Errors** (ADR-0032): `transient | ambiguous | permanent{code} | duplicate{remoteId?} | rate_limited{scope, resetAt} | auth_expired | auth_revoked | app_config`.

- An `ambiguous` error on a step whose effect is `public` → `unconfirmed`, never a blind retry.
- `auth_revoked` is definitive only after a confirming call with fresh credentials.
- `app_config` (bad client secret, suspended app, X credits below zero) creates a `provider_app_incidents` row and never flags user accounts.
- Meta auth errors map by subcode:
  - 458 / 460 / 467 → revoked
  - 463 → expired
  - 459 / 464 → user-fixable
  - 492 → lacks Page role
  - FB 506 → `duplicate`

**Also**

- **`validate(manifest, draft)`** is one function. It runs in the editor (live), in the API (at schedule) and in the worker (preflight, re-run at claim, not covered by approval).
- **SDKs:** raw fetch by default. An SDK is allowed only if it accepts an injected `fetch`/agent and passes dependency review: `@atproto/api` yes, `twitter-api-v2` unnecessary, `googleapis` no (YouTube resumable upload is written directly). Use `twitter-text` for X counting.
- **Conformance suite** runs on every provider: the manifest parses, settings round-trip, and errors map correctly against recorded fixtures. A provider cannot leave `experimental` without recorded real-response fixtures.
- **Provider facts** (limits, quotas, review gates) are kept in [provider facts](../reference/provider-facts.md), each with its source URL and the date it was checked. Re-verify them before each provider is built.
