# Security by construction

| Threat | Kronaut control | Enforced by |
|---|---|---|
| Upload path traversal | no request-derived paths; storage key = `sha256(workspace_id ‖ master_sha256)`; key regex; media served by a separate role without DB creds | fuzz test (encoded `..`, `%2f`, Unicode, symlink) |
| Predictable secrets from a non-crypto PRNG | a single `randomToken()` (`crypto.randomBytes(32)`) | GritQL ban on `Math.random` in server code |
| Routes public by accident (allowlist-based auth) | `defineRoute({auth: 'session'\|'grant'\|'reviewer'\|'public', action, …})` required; deny by default; every route calls `authorize()` | route-enumeration test: every route 401s unless it is in the committed public-route snapshot (CODEOWNERS) |
| Long-lived session tokens; one secret reused for signing and encryption | opaque DB sessions, `__Host-` cookie, HttpOnly, Secure, SameSite=Lax, 7 d idle / 30 d absolute; logout-all = delete rows; a password change revokes all | no JWT lib for sessions; expiry tests |
| Token purpose confusion | per-purpose tables + prefixes (`kro_sess_`, `kro_<key_id>_`, `kro_rvw_`, `kro_rst_`), HKDF-derived HMAC keys per purpose, versioned pepper | no generic `verify(blob)` exists |
| Provider tokens leaked from storage or API responses | envelope vault (ADR-0021) in a separate table; only `packages/credentials` imports it; runtime response parse strips unknown keys | **secret-canary test**: seed `CANARY_*` values, grep every response, error, log, export, MCP output |
| MIME spoof / SVG XSS | quarantine → magic-byte sniff → re-encode (sharp) / remux (ffmpeg) → strip EXIF; allowlist JPEG/PNG/WebP/MP4; separate media hostname, `nosniff`, `CSP: default-src 'none'; sandbox` | polyglot/SVG/HTML fixtures |
| Stored XSS in post previews | ProseMirror JSON only; previews render text nodes | Biome `noDangerouslySetInnerHtml` = error; strict CSP + Trusted Types |
| SSRF via user-supplied URLs | `packages/egress` is the only network path; `setGlobalDispatcher` at boot; per-provider host allowlists; user-supplied hosts (Mastodon, WordPress, RSS, webhooks, URL import) pinned + range-checked | `noRestrictedGlobals: fetch` + restricted imports outside egress; DNS-rebinding test |
| Per-instance app registration (Mastodon, ADR-0051) abused to probe hosts or flood a server | only a connect start by a session holding `channels:connect` registers; at most 10 registrations per workspace per hour (`rate_buckets`, 429 beyond); `instance` is normalised (no port, path, userinfo or IP literal) and egress still range-checks and pins it; the client secret is sealed in the envelope vault | `channels/instance-host.test.ts`, `channels/connect-instance.db.test.ts` |
| Forged billing webhooks | raw-body signature verify, event-id idempotency, server-side lookup; the billing module is not registered in owner mode | signature/replay/mismatch tests |
| CI pwn-request | `permissions: {}` default, `pull_request` only, actions pinned to SHA, tag-triggered release in a protected env | zizmor in CI, Renovate digest pinning |
| Container breakout; secrets in env | distroless nonroot, `read_only`, tmpfs `/tmp`, `cap_drop: ALL`, `no-new-privileges`, digests; secrets via compose `secrets:` files (0400) | compose lint script |
| Injection reads or rewrites users, sessions, entitlements or instance state | global tables default-deny for `kronaut_app` (own rows only for identity, own organization only for billing data); cross-tenant work only through allowlisted `SECURITY DEFINER` functions that return ids; instance release, entitlement and signing-key writes only as `kronaut_operator` (ADR-0048) | `packages/db/test/privileges.sql`: TEN-04..07 compare the catalog with the ADR exactly |

## Principals, roles, policy (ADR-0026..ADR-0029)

- **Principals:** `user | grant | reviewer | system | cli`.
  - The worker runs as `system` and only executes an existing authority.
  - The CLI is break-glass and audited.
- **Roles:** owner, admin, editor, contributor, viewer, client.
  - Approving is a separate `memberships.can_approve` flag, not a role.
- **`authorize(principal, action, resource, inputs)`** returns `allow | deny{code} | require_approval`.
  - Precedence: deny > require_approval > allow.
  - It is a single pure function used by routes, every MCP tool and the worker claim.
  - Each decision is audited with `policy_version`.

## Machine access (ADR-0013, ADR-0014, ADR-0027)

- `access_grants` + `grant_tokens`, in the format `kro_<key_id>_<secret>`, looked up by HMAC-SHA256.
- **Effective rights** = scopes ∩ the sponsor's *current* role ∩ `access_scopes` when `resource_scope='restricted'` (0 rows = nothing).
- **Grantable scopes (15):**
  - reads: `brands`, `channels`, `groups`, `posts`, `media`, `analytics`, `comments`, `audit`
  - `posts:draft`, `posts:submit`, `posts:schedule`, `posts:cancel`
  - `media:write`, `comments:write`, `ai:generate`
- **Never grantable** (a DB CHECK enforces this): `approvals:decide`, `channels:connect`, `review_links:create`, `grants:manage`, `members:manage`, `policy:write`, `webhooks:manage`, `settings:write`, `billing:manage`.
- **No key or agent can approve.**

## Approval (ADR-0010, ADR-0011, ADR-0016, ADR-0042)

- **Per-destination content hash** over the canonical JCS payload (canonicalisation rules: ADR-0010).
  - ADR-0010's `\r\n → \n` and NFC are applied together until the text stops changing, so canonicalisation is idempotent. A run of CRs before an LF collapses to one LF (`x\r\r\n` → `x\n`); any other lone CR stays.
- **Schedule binding:** `approved_scheduled_local/tz/tolerance_min` columns, checked by CHECK.
- **Policy:** `mode none|required`, with a brand override.
  - `provision_*` gives each new workspace a `mode='none'` policy with self-approval on, since its only member is the owner.
  - If no policy row applies, the strictest one is used: approval required, no self-approval, tolerance 0.
  - Tightening applies at claim; loosening never auto-approves.
  - Adding or swapping a destination creates a row with no approval (fail-closed). Removing one voids nothing.
- A grant never schedules without a human approval, even under policy `none` (`trg_dest_guard`, `authorize()`); this is how ADR-0027's 'approved/exempt' applies to grants.
- **Who can decide:**
  - The requester's own decision is refused, and their approval never counts, unless both the live policy and the request's snapshot allow self-approval (`authorize()` and trigger).
  - User approvals need a session authenticated in the last 12 h. `POST /v1/auth/reauthenticate` refreshes it with the password; 5 failures revoke the session.
- **Review links:**
  - An explicit post set (`review_link_posts`); the `kro_rvw_` token is exchanged for a `__Host-` cookie.
  - Deciding needs `can_decide` + an email OTP.
  - 5 failed OTPs lock the link; links last ≤ 90 days and are revocable.
  - Reviewer uniqueness is checked on `lower(email)`.

## Agents & AI (ADR-0012, ADR-0030, ADR-0039)

- **Agent taint:** `app.actor` → trigger → `posts.agent_dirty`.
  - The revision is tainted and `agent_content` is sticky on the destination.
  - `CHECK agent_content → approval_required`.
  - A human saving a checkpoint does not launder agent content.
- **MCP tools:** `get_brand_context`, `list_channels`, `list_account_groups`, `draft_campaign`, `update_draft`, `add_media_from_url`, `validate_draft`, `preview_post`, `request_approval`, `schedule_approved_post`, `get_publish_status`, `cancel_scheduled_post`, `get_post_metrics` (Phase 2).
  - Mutating tools require an idempotency key.
  - Third-party text is returned wrapped as `{untrusted:true, source, text}`.
  - There are no approve, publish_now, connect, settings or grant tools.
- **Server-side AI:** has zero tools and returns Zod-structured drafts only. It never sees credentials, and LLM hosts are allowlisted in egress.

## Also

- **Idempotency (ADR-0040):** every mutating write, UI included, goes through `idempotency_keys(workspace_id, actor_key, key)`. Same key with a different body → 409.
- **Audit (ADR-0015):**
  - insert-only (`REVOKE UPDATE, DELETE`), `occurred_at` = transaction time, monthly partitions
  - ids and codes only, no content or tokens
  - `maintain_audit_partitions` runs daily from the app cron: it creates partitions two months ahead, drops those past 400 days, nulls `ip_prefix`/`ua_hash` after 90 days and reports the default partition's row count, which must be 0 (ADR-0045)
  - `audit_seals` is filled by a Phase 2 job; `ip_prefix`/`ua_hash` sit outside the seal hash
- **Credentials (ADR-0021):**
  - a per-row DEK with AES-256-GCM, wrapped by `KRONAUT_KEK_<v>`
  - AAD = `aad_v|credential_id|workspace_id|provider`
  - KEK rotation re-wraps DEKs only
  - webhook secrets rotate with a `previous_secret` overlap
- **Entitlements (ADR-0019):** a single `entitlements.check()` in the service layer at 5 points, with conditional counter UPDATEs. Self-host is unlimited. Checking `MODE==='saas'` is banned outside the entitlements module.
- **CF Access fail-closed:** the app verifies `Cf-Access-Jwt-Assertion` (aud + JWKS) when `ACCESS_AUD` is set.
  - **Checks:** RS256 against the team JWKS (`https://<ACCESS_TEAM_DOMAIN>/cdn-cgi/access/certs`), `aud` contains `ACCESS_AUD`, `iss` is the team domain, and `exp`/`nbf` hold with 60 s leeway. `jose` verifies; the JWKS is fetched through `packages/egress` and handed to `jose` as a local key set.
  - **Scope:** every app-role request except `GET /healthz` and `GET /readyz` (probes from inside the network) and `GET /oauth/<provider>/<name>`, the public provider documents that providers fetch server-to-server (ADR-0053). The Access application needs a matching bypass policy for `/oauth/*`. The media role never checks it, since providers fetch media directly. A missing or invalid assertion gets one generic 403 before routing; the reason is logged at warn, never the token.
  - **Keys:** fetched at boot, and boot fails without them. They are refetched hourly, and immediately on an unknown `kid` (at most once per 60 s); a failed refetch keeps the last good set.
  - **Identity:** Access is an outer gate only. The session or grant is still required, and the Access identity is not matched to the user.
- **Owner mode:**
  - The registration route is registered only when entitlements enables registration; the `MODE` check lives in `apps/server/src/entitlements/`.
  - `kronaut user create --owner --email <e> --name <n> --workspace <name> --timezone <tz>` creates the owner without a password, provisions the organization and workspace (`provision_organization`), and prints the same one-time link as a reset.
  - `kronaut user reset-password <email>` prints a 15-min one-time link and revokes every session of the user. No CLI command takes a password, on argv or stdin.
  - **The one-time link** is `<KRONAUT_PUBLIC_URL>/reset-password#token=…`; `POST /v1/auth/password {token, password}` (public) consumes it, and the web page comes with the Phase 1 UI.
    - The token is stateless, so it needs no table: an HMAC under a `KRONAUT_SECRET` purpose key over the user id, the expiry (now + 15 min) and a hash of the user's current `password_hash` (empty when unset).
    - Setting a password changes that hash, so a link works once and every older link dies with it.
    - Consuming it checks the signature, expiry and binding, runs the password policy, sets the hash, deletes the user's sessions and writes `user.password_reset`. Any bad, expired or used token gets one generic 400.
  - The user commands run on `KRONAUT_DATABASE_URL` (app role) acting as that user; `restore-complete` and `release` run on `KRONAUT_OPERATOR_DATABASE_URL` (a login granted `kronaut_operator`, ADR-0048).
  - Each user command writes a `security_events` row: `cli.user_created` or `cli.password_reset_issued`. `instance_mark_restored()` and `instance_release()` write their own `instance.*` rows. The link goes to stdout only; it is never logged, and no event carries the token.
- **Account self-service:**
  - `POST /v1/auth/password/change` checks the current password under the same session lock and 5-failure lockout as `POST /v1/auth/reauthenticate` (a wrong one is 422, the fifth revokes the session). Like re-login, it refuses accounts with two-factor sign-in (422 `two_factor_unavailable`, counted as a failure) until a second-factor check exists; success keeps the current session, revokes every other session of the user and writes `user.password_changed`.
  - `PATCH /v1/me` changes only the caller's own `users` row (display name and `ui_locale`), as the user actor under RLS `self_only`.
- **Supply chain:** `--frozen-lockfile`, an `onlyBuiltDependencies` allowlist, `minimumReleaseAge ≥ 7d`, and a prod dependency budget gate.
- **Security test suite:** the [33 security tests](../reference/security-tests.md) and the [reliability matrix](../reference/reliability-tests.md) are CI gates. The 50 schema smoke checks become CI tests against `packages/db/schema/v1.sql`.
