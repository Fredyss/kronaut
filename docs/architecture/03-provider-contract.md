# Provider plugin contract

One folder per provider. `manifest.ts` is declarative and browser-safe; `runtime.ts` is server-only. The registries are hand-listed, with no codegen: a new provider is added to `packages/providers/src/manifests.ts` and `runtime.ts` for the server, and to `apps/web/src/base/providers/ui.ts` for the web. Contract: ADR-0032, ADR-0036.

**Manifest fields**

- **Identity and auth**
  - `id`
  - `apiVersion`: pinned and dated, plus its sunset date. LinkedIn sends it as the mandatory `Linkedin-Version` header; each version lives at least 1 year.
  - `availability{state, caveatKey}`
  - `auth`: kind, plus `refresh` (one of `none | self_refresh | reusable | rotating | single_use`), access/refresh TTLs and `warnLead`.
  - `auth.instanceScoped`: the provider's apps are per server (Mastodon). The server registers one on demand through `registerApp` at connect start (ADR-0051); the conformance kit fails an instance-scoped provider without `registerApp`.
  - `auth.connectPicker: 'kronaut'`: the network's dialog can't pick the accounts (Discord's bot install picks only a server), so Kronaut shows a picker over the accounts `connectFinish` returns (ADR-0062). Only for a provider whose account credentials hold **no secret**, only ids; the secret lives in the provider app. Conformance fails it with an `auth.refresh` other than `none`.
- **Content limits**
  - Text limits and counting strategy: `x-weighted` (Kronaut's own counter in `@kronaut/compose` following X's documented rules: NFC, weight 1 for the ranges U+0000–U+10FF, U+2000–U+200D, U+2010–U+201F and U+2032–U+2037 and 2 for everything else, an emoji cluster as 2, every URL as 23; URLs are `http(s)://` or `www.` tokens and bare hosts whose TLD is in the bundled IANA list, regenerated with `pnpm tlds:update`, which reads the IANA list on stdin), `mastodon` (graphemes, each link as the limit's `urlWeight`, a remote mention as its username part), `threads` (graphemes, an emoji or flag cluster as its UTF-8 bytes), `graphemes`, `utf16`, or `utf8-bytes`.
    - **Composite limits** are allowed: Bluesky checks 300 graphemes *and* 3,000 bytes.
    - `maxLinks`: the most **unique** links one item's text may hold (Threads: 5). `countLinks()` counts each distinct `http(s)://` URL and each bare host such as `www.example.com`, matched as written; it errs towards over-counting. Over the limit, `validate()` reports `too_many_links`.
    - Limits can be **per instance** (Mastodon reads `/api/v2/instance`). `accountPostType?(postType, capabilities)` returns the post type with an account's stored `capabilities` applied; `validate()` takes those capabilities and uses it at schedule and at claim.
  - `forbiddenChars`: characters the text of `main` items must not contain (YouTube: `<` and `>`). `validate()` reports `forbidden_characters`.
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
  - `requiredSettings`: keys that must be present and non-blank at schedule and at claim, such as YouTube's `title`. A draft may omit them, so draft save only parses the schema. `validateSettings()` reports `setting_required` with the `field`, and the API puts it at `destinations.<n>.settings.<field>`.
  - `accountSettingOptions?(capabilities)`: per setting key, a list of `{value, label}` built only from the account's stored `capabilities`, with no network call ([ADR-0063](../adr/0063-per-account-setting-options.md)). The channels list returns it as `settingOptions`, and the composer renders such a setting as a select. The schema checks only the value's shape; a stale value fails at publish (Pinterest: `boardId` from the boards stored at connect, a gone board is `board_gone`).
- **Cost:** `cost{model, perPost{usdMicros, linkUsdMicros, asOf, sourceUrl}}`. The channels list returns `perPost` as `cost` (`linkUsdMicros` null when absent; `cost` null for a free provider). The composer prices each chain item as one post, at `linkUsdMicros` when `extractXUrls()` finds a URL in it.
- **Verification:** `verify.mode`, one of `idempotency_key | deterministic_id | status_by_ref | list_recent_match | none`.
- **Rate limits:** `rateLimits[{scope account|app|instance, headerParser}]` plus concurrency.
- **Preview:** the archetype.
- **Capabilities:** `analytics`, `delete`.
- **Manual only:** optional `manualOnly`, for a network whose rules require that a person chooses each scheduled post ([ADR-0064](../adr/0064-manual-only-providers.md)). Kronaut's jobs then never schedule to its channels: a queue-mode RSS feed refuses the channel (`channel_manual_only`), the evergreen fill skips it, and a repeat is refused (`repeat_manual_only`). The channels list returns it as `manualOnly`. Pinterest sets it.
- **Data retention:** optional `dataRetention{disconnectedDays, lapsedDays}`, for a network whose policies bound how long Kronaut keeps its data (ADR-0060). The daily `credential_retention` task purges a channel's credentials, profile and metrics that many days after it was disconnected or went `needs_reauth`. Without it, only the 30-day credential purge applies. Conformance requires whole days of at least 1.

**Runtime**

- `connect`, `refresh`.
- `registerApp?(ctx, {instanceHost, redirectUri, clientName, website?})` → `{clientId, clientSecret}`: required when `auth.instanceScoped`. The server seals the secret and stores the `provider_apps` row with `instance_host`.
- `ProviderApp.botToken`: an app-level secret next to `clientSecret`, sealed in its own `provider_apps` columns (ADR-0061). `discord_bot` posts with it for every channel. Providers never log or return it, and a rejected token is `app_config`.
- `ProviderApp.instanceHost` names the server of an instance-scoped app; providers build every URL from it, never from response data.
- `connectFinish` returns a list of accounts (ADR-0053). Single-account providers return one; Facebook returns one per Page the person shared and can create content on.
  - An empty list fails the connect with `no_accounts`.
  - The server saves every returned account in one transaction, each credential with the manifest's `auth.kind`. It never changes accounts the list leaves out.
  - An intermediate token, such as Facebook's long-lived user token, stays inside `connectFinish`; it is never stored or returned.
  - With `auth.connectPicker: 'kronaut'`, the server stores the list sealed in `ephemeral_kv` for 15 minutes instead, and saves only the accounts the person ticks, through the same path (ADR-0062).
- Each account `connectFinish` returns may carry `capabilities` (per-account limits, such as a Mastodon server's `/api/v2/instance` configuration); the server stores them in `social_accounts.capabilities`.
- `publish` runs the step list and returns `{remoteId,url} | {pending}`.
- `poll`, `verify?`, `analytics?`.
- `analytics?(ctx, {app, account, credentials, remoteIds, postTypes})` (`postTypes`: remote id → the destination's post type) → `{posts: {remoteId → {metric → number | null}}, failed?: {remoteId → ProviderError}, apiVersion}` and `accountMetrics?(ctx, {app, account, credentials})` → `{followers: number | null, apiVersion, profile?: {displayName, handle?, profileUrl?}}`. A provider that returns `profile` (YouTube, Pinterest) has the server overwrite the channel's `display_name`, `handle` and `profile_url` with it while the channel is still `active`, so a stored profile never goes stale (ADR-0060). `app` carries `instanceHost` for instance-scoped providers; `failed` reports per-post errors in a batch; a remote id in neither `posts` nor `failed` was not read this time and stays due. Read-only calls with `effect: none`; they return the same `ProviderError` kinds. Batching is the provider's business, within its manifest rate limits. See [Analytics](05-publishing-pipeline.md#analytics).
- `readInstanceCapabilities?(ctx, instanceHost)`: re-reads an instance-scoped provider's server limits. The daily `account_capabilities_refresh` cron stores them for every active account whose `capabilities.fetchedAt` is over 24 h old, one call per host, keeping the old values when a server fails.
- `revoke?(ctx, {app, account, credentials})`: invalidates the stored token at the network. Disconnecting a channel whose runtime has it enqueues a `revoke_credential` job (ids and credential version only, never the token) in the same transaction. The job revokes only while the account is still disconnected and the credential version unchanged; transient failures retry with the queue's backoff, and a refusal is logged and left to the 30-day purge. Mastodon implements it (ADR-0051).
- `sharesGrant?(a, b)`: true when two stored credentials hold the same grant, so revoking one kills the other. After a successful revoke, the job flags each other `active` channel of that provider in the workspace with the same `provider_subject_id`, or whose credentials share the grant (only when the runtime has `sharesGrant` and the manifest sets `dataRetention`; ADR-0060). YouTube implements it by comparing refresh tokens, the fallback for channels connected before connect stored the Google account id (`sub`).
- `PublishItem.language` carries the variant's content language when it has one.

**ctx**

- egress `http`: rate-limited, retry-aware, redacted logs.
- `media.signedUrl()` / `media.stream()`.
- `checkpoint()`, which persists `provider_state` after each step.
- `logger`.
- Providers never touch the DB.

**Kit helpers** (`_kit/public-send.ts`)

- `beginPublicSend()` runs the public `step()`, stamps `sentAt` and checkpoints it. Call it right before the send, unless the step's retry is already safe, as with Bluesky's deterministic rkey or a checkpoint after the send. Tests assert the order with `assertPublicSendOrder`.
- `afterSend()` wraps any read after a successful send, so a failed read can't reach `plan()`.

**Errors** (ADR-0032): `transient | ambiguous | permanent{code} | duplicate{remoteId?} | rate_limited{scope, resetAt} | auth_expired | auth_revoked | app_config`.

`failureForStatus()` in `_kit/status-failure.ts` maps an HTTP status to an error. A provider supplies its rate-limit reading and known errors. The defaults keep unknown statuses safe: on a public step they stay `ambiguous`. Graph-based providers classify by error code instead, in `_kit/meta-graph-call.ts` and `facebook/graph.ts`.

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
- **SDKs:** raw fetch by default. An SDK is allowed only if it accepts an injected `fetch`/agent and passes dependency review: `@atproto/api` yes, `twitter-api-v2` unnecessary, `googleapis` no (YouTube resumable upload is written directly). X counting uses no SDK: Kronaut's own `x-weighted` counter follows X's documented counting rules.
- **Conformance suite** runs on every provider: the manifest parses, settings round-trip, and errors map correctly against recorded fixtures. A provider cannot leave `experimental` without recorded real-response fixtures.
- **Provider facts** (limits, quotas, review gates) are kept in [provider facts](../reference/provider-facts.md), each with its source URL and the date it was checked. Re-verify them before each provider is built.
