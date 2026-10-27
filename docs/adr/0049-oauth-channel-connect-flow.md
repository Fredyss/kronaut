# ADR-0049: OAuth channel connect flow

- **Status:** Superseded by [ADR-0053](0053-multi-account-channel-connect.md)
- **Date:** 2026-10-23
- **Deciders:** Frederik Schlentc
- **Area:** Providers, security
- **Spec:** [Provider contract](../architecture/03-provider-contract.md), [Security](../architecture/06-security.md), [Media](../architecture/07-media.md)

## Context

The provider contract already has `connectStart`, `connectFinish` and `publicDocuments`, but nothing on the server drives them. ADR-0047 requires an ADR for the connect flow (callback, pending state, public metadata URL) before the Bluesky provider ships. Instagram needs the same flow.

## Decision

**One generic, session-only connect flow for every OAuth provider.**

- **Start:** `POST /v1/workspaces/:workspaceId/channels/connect` with `{provider}`.
  - Session auth only: `channels:connect` is never grantable.
  - It picks the provider's single `active` app with `instance_host = ''`; none or several → `app_config`.
  - It calls `connectStart` and returns `{authorizationUrl}`. The browser navigates there.
- **Pending state:**
  - `state` is 32 random bytes, base64url.
  - It is stored in `ephemeral_kv` under `oauth:<sha256(state)>` for 10 minutes. The value holds the workspace, the user, the hash of the starting session, the provider and app ids, and the provider's `pending` (PKCE verifier, DPoP key).
  - `pending` is sealed with AES-256-GCM under `purposeKey(secret, 'oauth-pending/v1')`, with the kv key as AAD. Losing the table only makes an in-flight connect fail.
- **Callback:** `GET /v1/oauth/:provider/callback`, a public route in the snapshot.
  - It consumes the state once (`DELETE … RETURNING`).
  - The request's session must be the one that started the flow, which blocks login CSRF and account injection. The user must still hold `channels:connect` in that workspace.
  - Then `connectFinish`. In one transaction:
    - upsert `social_accounts` on `(workspace_id, provider, provider_account_id)`;
    - seal and replace the `oauth` credential;
    - set the account `active`;
    - write the audit row;
    - write `channel.reconnected` if the account was `needs_reauth`.
  - It redirects to `${KRONAUT_PUBLIC_URL}/channels` with `connected=<id>` or `error=<code>`. Provider error text is never reflected.
- **Redirect URI:** `${KRONAUT_PUBLIC_URL}/v1/oauth/<provider>/callback`, fixed per provider and registered with the provider app.
- **Public documents:** `GET /oauth/<provider>/<name>` serves `publicDocuments(app)` for that app, e.g. Bluesky's client metadata and JWKS.
  - Providers fetch these server-to-server, so these paths, and only these, are exempt from the Cloudflare Access gate.
  - The Access application needs a matching bypass policy.

## Options considered

- **Chosen:** the decision above.
- Rejected: pending state in a cookie. It is bounded by cookie size (a DPoP key and PKCE verifier fit, but provider state may grow), and it can't be consumed server-side exactly once.
- Rejected: a durable `oauth_states` table. It needs a schema change for data that is worthless after 10 minutes.
- Rejected: not binding the callback to the starting session. An attacker could connect their own account into a victim's workspace.

## Consequences

- Every OAuth provider reuses one flow; providers implement only `connectStart` and `connectFinish`.
- The Access gate gains a second exemption, and self-hosters must add a bypass policy for `/oauth/*`.
- Revisit when: a provider needs per-workspace apps (Mastodon instances), or connect must work without a browser session (MCP / API).
