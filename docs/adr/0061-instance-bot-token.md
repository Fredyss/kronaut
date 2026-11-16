# ADR-0061: The instance bot token is a second app secret

- **Status:** Accepted
- **Date:** 2026-11-16
- **Deciders:** Frederik Schlentc
- **Area:** Providers, security
- **Spec:** [Provider contract](../architecture/03-provider-contract.md), [Security](../architecture/06-security.md), [Data model](../architecture/04-data-model.md), [Provider facts](../reference/provider-facts.md)

## Context

The `discord` provider posts through one incoming webhook per channel, created in Discord's OAuth dialog. A webhook can't be checked after a lost answer, so every ambiguous send ends `unconfirmed`. `discord_bot` instead posts as one bot. The bot token belongs to the instance's Discord application, not to any workspace, and every channel in every workspace that installs the bot uses it.

Two facts shape the design (D1, re-verified 2026-11-16):

- **The server must be proven.** After a bot install, the redirect carries `guild_id`, but Discord says it "should only be used as a hint". On one shared instance bot, trusting it would let a person in workspace A make Kronaut list, and then post to, the channels of a server that only workspace B added the bot to. A bot install with `response_type=code` and a redirect turns into a full code grant. The token exchange, with the client secret, returns the `guild` object the bot actually joined, and Discord only adds a bot to a server where the person has the permissions to do so.
- **The token is an app secret, not an account credential.** It acts for every channel the bot is in. If it sat in each `account_credentials` row, it would be copied per channel and workspace, rotating it would rewrite them all, and the picker in ADR-0062 would have to hold secrets.

## Decision

**The bot token is a second app secret on the `provider_apps` row, sealed like the client secret.**

- **Schema:** migration `0037_provider_app_bot_token` adds `bot_token_ciphertext`, `bot_token_nonce`, `bot_token_wrapped_dek` and `bot_token_kek_version` to `provider_apps`. A `num_nulls(…) IN (0,4)` CHECK, added `NOT VALID` and then validated, keeps the four together. Grants follow the client-secret columns, through the table-level grants v1.sql already makes. Backups pick up the new KEK version column by its `kek_version` suffix.
- **Encryption** (ADR-0021, unchanged): the same per-value DEK and KEK keyring as the client secret. The AAD uses the app id and the nil workspace like the client secret, but with the provider `bot_<provider>`. A ciphertext copied from one column to the other then fails to open.
- **Contract:** `ProviderApp.botToken?: string` is loaded together with `clientSecret` and handed only to the provider runtime. It is never logged, serialised or returned.
- **CLI:** `kronaut provider-app register discord_bot --client-id <17–20 digits>` reads the client secret and the bot token from stdin, one per line, never from argv or env, and never echoes them. It refuses while an active `discord_bot` app exists.
- **Connect:** `discord_bot` authorises with `response_type=code`, `scope=bot`, `permissions=248832` (View Channel, Send Messages, Embed Links, Attach Files, Read Message History, Mention Everyone), `state` and `redirect_uri`.
  - It takes the server only from the exchange's `guild`, and discards Discord's user tokens.
  - With the bot token, it reads the bot's user id and the server's text and announcement channels, and offers them in Kronaut's picker (ADR-0062).
  - An account credential holds only `{guildId, channelId, botUserId}`. The manifest's `auth.kind` is `bot_token`, so these rows are told apart from `oauth` ones.
- **Errors:** a 401 means the instance bot token is wrong, so it is `app_config` (`bot_token_invalid`), an app incident, not an account one. A missing token is `app_config` `bot_token_missing`.

## Options considered

- **Chosen:** the decision above.
- Rejected: packing the bot token into the client-secret ciphertext, for example as JSON. Every reader of `clientSecret` would have to unpack it. Registering or rotating one secret would rewrite the other. And a provider with only a client secret would need the same packing.
- Rejected: the bot token in each account credential. It copies one instance secret into every channel row, and it would make the picker hold secrets.
- Rejected: the bot-only install without a code grant, trusting the redirect's `guild_id`. Discord calls it a hint, and on a shared bot it opens a cross-workspace path.
- Rejected: a separate table for app secrets. One more join and more grants, for two columns.

## Consequences

- One Discord application can serve both providers, but each provider registers its own `provider_apps` row. `discord` needs only the client secret.
- The CLI can't rotate the bot token yet. Channels stay bound to their app row, so a new row wouldn't move them; rotation needs its own command, which updates the sealed columns in place.
- Everyone who can connect `discord_bot` in any workspace uses the same bot. Kronaut only posts to channels of a server that the exchange proved, and only to the channels the person picked.
- Removing the bot from a server is the server's admins' job in Discord; Kronaut has no revoke for it.
- Revisit when: a second provider needs an app-level secret beyond the client secret, or the bot token must be rotated without a new app row.
