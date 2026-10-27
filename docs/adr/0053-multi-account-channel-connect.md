# ADR-0053: One connect can add several channels

- **Status:** Accepted
- **Date:** 2026-10-27
- **Deciders:** Frederik Schlentc
- **Area:** Providers, security
- **Spec:** [Provider contract](../architecture/03-provider-contract.md), [Security](../architecture/06-security.md)
- **Supersedes:** [ADR-0049](0049-oauth-channel-connect-flow.md)

## Context

ADR-0049 defines one generic OAuth connect flow, and every connect produces exactly one `social_accounts` row with an `oauth` credential. A Facebook login is different. It authorises a person, and that person may manage several Pages. Each Page is the account that publishes, with its own Page token. Meta's login dialog already lets the person choose which Pages the app may use, and `GET /me/accounts` returns only those Pages.

## Decision

**ADR-0049's flow stands, with two changes: `connectFinish` returns a list of accounts, and the credential kind comes from the manifest.**

- **Start:** `POST /v1/workspaces/:workspaceId/channels/connect` with `{provider}`.
  - Session auth only: `channels:connect` is never grantable.
  - It picks the provider's single `active` app with `instance_host = ''`; none or several → `app_config`. ADR-0051 adds per-instance apps.
  - It calls `connectStart` and returns `{authorizationUrl}`. The browser navigates there.
- **Pending state:** unchanged from ADR-0049.
  - `state` is 32 random bytes, base64url.
  - It is stored in `ephemeral_kv` under `oauth:<sha256(state)>` for 10 minutes, sealed with AES-256-GCM under `purposeKey(secret, 'oauth-pending/v1')` with the kv key as AAD.
- **Callback:** `GET /v1/oauth/:provider/callback`, a public route in the snapshot.
  - It consumes the state once. The request's session must be the one that started the flow, and the user must still hold `channels:connect` in that workspace.
  - **`connectFinish` returns `readonly ConnectedAccount[]`.** Single-account providers return one element.
    - **Empty list:** the connect fails with `no_accounts`, for example when the person shared no Page or none they can post to. Nothing is written.
    - **More than `MAX_CONNECT_ACCOUNTS` (100):** the connect fails with `too_many_accounts`. A provider should throw `permanent` `too_many_accounts` before any per-account call; the server also checks. 100 also bounds the `connected` redirect.
  - **In one transaction, for every returned account:**
    - upsert `social_accounts` on `(workspace_id, provider, provider_account_id)`;
    - seal and replace its credential, whose kind is the manifest's `auth.kind` (`oauth`, or `page_token` for Facebook);
    - set it `active`, and resolve its open credential incidents;
    - write its audit row;
    - write `channel.reconnected` if it was `needs_reauth`.
    - Either every account is saved or none is.
  - It redirects to `${KRONAUT_PUBLIC_URL}/channels` with `connected=<id>[,<id>…]` (public ids, comma-separated, in the order returned) or `error=<code>`. Provider error text is never reflected.
- **What a connect doesn't do:** it never disconnects or changes accounts it didn't return. A Page left unticked on a later login keeps its channel and stored token until that token stops working, which then raises the usual `needs_reauth`.
- **Token handling:** a provider may use an intermediate token, such as Facebook's long-lived user token, only inside `connectFinish` to derive per-account credentials. It must not be stored or returned.
- **Redirect URI:** `${KRONAUT_PUBLIC_URL}/v1/oauth/<provider>/callback`, fixed per provider and registered with the provider app.
- **Public documents:** `GET /oauth/<provider>/<name>`, unchanged from ADR-0049.

## Options considered

- **Chosen:** the decision above. Meta's own dialog is the Page picker.
- **Rejected: a Kronaut Page picker after the callback.** The per-Page tokens would sit sealed in `ephemeral_kv` until the person chose. It needs a new page and route, and it adds a step that only repeats Meta's dialog.
- **Rejected: connecting only the first Page.** It picks the wrong Page for anyone who manages several, with no way to choose.
- **Rejected: one connect per Page,** passing the Page id through `connectStart`. Kronaut can't know the person's Pages before they log in.

## Consequences

- Each provider implements only `connectStart` and `connectFinish`; single-account runtimes wrap their result in a list.
- The `connected` redirect parameter becomes a list. The channels page names every connected account.
- Connecting a Facebook user with many Pages creates a channel for each one they ticked. Removing unwanted ones needs channel disconnect, which doesn't exist yet.
- Revisit when connect must work without a browser session (MCP / API), or a provider has no account picker of its own.
