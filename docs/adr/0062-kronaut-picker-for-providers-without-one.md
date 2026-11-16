# ADR-0062: Kronaut picks the channels when the network's dialog can't

- **Status:** Accepted
- **Date:** 2026-11-16
- **Deciders:** Frederik Schlentc
- **Area:** Providers, security
- **Spec:** [Provider contract](../architecture/03-provider-contract.md), [Security](../architecture/06-security.md)
- **Extends:** [ADR-0053](0053-multi-account-channel-connect.md)

## Context

ADR-0053 lets one connect add several channels and relies on the network's own dialog to choose them: Meta's login dialog lists the Pages, and `connectFinish` returns only those. It rejected a Kronaut picker after the callback, because per-account tokens would wait sealed in `ephemeral_kv` until the person chose. Its revisit trigger was "a provider has no account picker of its own".

That trigger has now fired. Discord's bot install (`discord_bot`) lets the person pick a **server**, never its channels. Returning every text and announcement channel would connect all of them without asking, and a large server would fail the 100-account limit.

## Decision

**A provider may declare that Kronaut picks among the accounts its `connectFinish` returns.** Everything else in ADR-0053 stands.

- **Manifest:** `auth.connectPicker?: 'kronaut'`. Leaving it out means the network's own dialog picks, as before.
- **Only for accounts that hold no secret.** The provider may set it only when no returned account credential holds a secret: the secret lives in the provider app (`discord_bot`'s bot token is the app's; ADR-0061). The credentials are then only identifiers (`guildId`, `channelId`, `botUserId`).
  - This answers ADR-0053's objection: nothing that could act on the network waits in `ephemeral_kv`. A leaked entry would show channel ids and names, but couldn't be used to post.
  - Enforcement: the provider contract states the rule. Conformance fails a picker provider whose `auth.refresh` isn't `none`. The `discord_bot` tests assert that its credentials hold only those three ids.
- **Callback:** for such a provider, the callback doesn't save anything. An empty list still fails with `no_accounts`. Otherwise it stores the candidates and redirects to `/channels?pick=<selection id>`.
  - The selection id is 32 random bytes, base64url.
  - The candidates are stored in `ephemeral_kv` under `oauth:pick:<sha256(id)>` for 15 minutes, sealed with the connect's pending key and the kv key as AAD. Next to them, the entry stores what saving needs: workspace, user, provider, provider app id and client key id.
  - At most 500 candidates; more fails the connect with `too_many_accounts`.
- **Picker:** the channels page opens a modal. It lists the candidates (display name and server) with checkboxes, none ticked.
- **Routes:** all three are session-only, with `channels:connect`, the same action as starting a connect. API keys and agents can't use them.
  - `GET …/channels/selections/:selectionId` lists the candidates.
  - `POST …/selections/:selectionId/confirm` takes `{accounts: [providerAccountId…]}`. Duplicates collapse.
  - `DELETE …/selections/:selectionId` discards the selection. Repeating it, or calling it on a missing selection, still returns 204.
  - An entry is visible only to the workspace and user that started the connect. An unknown, expired or someone else's selection is a 404, and the page says it expired and to connect again.
- **Confirm:** it runs in one transaction. It locks the entry and checks the picked ids are a subset of the candidates (`422 not_offered` otherwise), and at most `MAX_CONNECT_ACCOUNTS` of them (`422 too_many_accounts`). It saves them through the same `persistConnection` path as a normal connect, with the same upsert, credential, incident and audit rules. Then it deletes the entry, so a failed confirm leaves the selection to try again.
- **Idempotency** (ADR-0040): confirm and cancel take an idempotency key. A repeat with the same key replays the first answer. A repeat with a new key after a success gets the 404, because the entry is gone.

## Options considered

- **Chosen:** the decision above.
- Rejected: connecting every channel the bot can see. It connects channels nobody asked for, and fails servers with more than 100 channels.
- Rejected: one connect per channel, with the channel passed to `connectStart`. Kronaut can't list a server's channels before the bot is in it.
- Rejected: keeping the picker in the browser, with the candidates in the redirect URL. The URL would carry account data and could be edited, and confirming would have to trust it.

## Consequences

- A new provider whose network has no picker of its own can use this one, as long as its account credentials hold no secret.
- The channels page gains a modal and the API three routes; the connect callback gains a `pick` redirect.
- Abandoning the modal leaves the entry until its TTL, when the `ephemeral_kv` sweep removes it.
- Revisit when: a provider without its own picker returns per-account secrets, or connect must work without a browser session.
