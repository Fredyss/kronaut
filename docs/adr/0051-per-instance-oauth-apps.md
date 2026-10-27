# ADR-0051: Per-instance OAuth apps (Mastodon)

- **Status:** Accepted
- **Date:** 2026-10-26
- **Deciders:** Frederik Schlentc
- **Area:** Providers, security
- **Spec:** [Provider contract](../architecture/03-provider-contract.md), [Security](../architecture/06-security.md), [Provider facts](../reference/provider-facts.md)

## Context

ADR-0049's connect start picks the provider's single `active` app with `instance_host = ''`, and names per-instance apps as the trigger to revisit it. Mastodon (ADR-0018, Phase 1) has no central app: every server issues its own `client_id` and `client_secret`, and anyone may register one with the public `POST /api/v1/apps`. v1.sql already allows this: the app role may insert `provider_apps` rows with `instance_host <> ''`.

Mastodon account ids are local to their server, so two servers can hand out the same id, but `social_accounts` is unique on `(workspace_id, provider, provider_account_id)`.

This ADR extends ADR-0049. Everything it does not change still applies.

## Decision

**Instance-scoped providers register their own app per server, on demand, at connect start.**

- **Manifest:** `auth.instanceScoped: true` marks a provider whose apps are per server. Mastodon is the first.
- **Start:** `POST /v1/workspaces/:workspaceId/channels/connect` takes an optional `instance`.
  - **Rules:** it's required for an instance-scoped provider and refused for any other provider.
  - **Normalisation:** a bare host or an `https://` origin, lower-cased, IDN converted to ASCII. It must have at least two labels and at most 253 characters, and no port, path, userinfo or IP literal.
  - Egress still refuses hosts that resolve to non-public addresses and pins the resolved address ([Security](../architecture/06-security.md), SSRF), so `instance` cannot reach internal services.
- **App lookup:** the newest `active` app for `(provider, instance_host)` whose stored `redirect_uri` equals the current callback. An app registered for an older public URL is never reused, so changing `KRONAUT_PUBLIC_URL` heals on the next connect.
  - **If there is none, Kronaut registers one** through the runtime's `registerApp`:
    - the client name is `Kronaut`;
    - the redirect URI is ADR-0049's fixed `${KRONAUT_PUBLIC_URL}/v1/oauth/<provider>/callback`;
    - the scopes are the manifest's.
  - The row stores the redirect URI it was registered with (migration `0006_provider_app_redirect_uri`). The client secret is sealed with the envelope vault, as operator-created apps are. The operator configures nothing for Mastodon.
  - Two concurrent registrations both succeed. The newest wins, and the extra row is harmless.
- **Abuse limit:** each workspace may register at most 10 apps per hour (a rate bucket). Beyond that the start is 429. Only a session holding `channels:connect` can register, as with every connect start.
- **Errors:**
  - an unreachable server is 503;
  - a server that refuses registration is 422 on `body.instance`;
  - a registered app the server no longer knows (`invalid_client` at token exchange) is marked `misconfigured`, so the next connect registers again.
- **Authorization:**
  - unchanged from ADR-0049: the same state in `ephemeral_kv`, the same session-bound callback, and the pending state names the instance's app;
  - PKCE S256 is always sent; Mastodon supports it from 4.3, and older servers ignore it;
  - the token exchange always uses the client secret.
- **Account identity:**
  - `provider_account_id` is `<account id>@<instance host>`;
  - `handle` is `@<username>@<instance host>`;
  - `profile_url` is the account URL.
- **Server limits:** at connect, the server's `/api/v2/instance` configuration is stored in `social_accounts.capabilities`: characters, attachments, the URL weight, media sizes, MIME types and the description limit. The publish work refreshes it daily.
- **Tokens:**
  - they don't expire, so `auth.refresh = none`;
  - disconnecting revokes the token with `POST /oauth/revoke` once a disconnect route exists.

## Options considered

- **Chosen:** the decision above.
- Rejected: operator-registered apps per server through the CLI. Every new server would need the operator, which fails for a team whose members use different servers.
- Rejected: one app per workspace and server. It adds no isolation, since tokens are already per account, and multiplies registrations on the same server.
- Rejected: `provider_account_id` without the host. Two servers can issue the same id, and the unique key would merge different people.

## Consequences

- Connecting Mastodon needs no operator setup; any public server works.
- `provider_apps` gains rows that the app role writes. Operator-only fields (instance-wide apps, `disabled`) stay guarded by v1.sql's policies.
- The provider contract gains `registerApp`, `ProviderApp.instanceHost` and `ConnectedAccount.capabilities`.
- Revisit when: a second instance-scoped provider (Lemmy, Pixelfed, WordPress) needs a different registration shape, or app registrations on a server must be cleaned up.
