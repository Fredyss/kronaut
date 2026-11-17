# ADR-0063: A provider may offer per-account options for a post setting

- **Status:** Accepted
- **Date:** 2026-11-17
- **Deciders:** Frederik Schlentc
- **Area:** Providers, composer
- **Spec:** [Provider contract](../architecture/03-provider-contract.md), [Frontend](../architecture/08-frontend.md)

## Context

A Pinterest Pin always goes to a board. Pinterest's consent dialog grants the whole account and can't pick boards, and the account has one rotating refresh token: every refresh returns a new one.

Making each board a channel (through the picker of ADR-0062) would store that one token in several credential rows. Kronaut refreshes each row on its own, so the first board to refresh could invalidate the others. The picker would also have to hold a refresh token, which ADR-0062 forbids.

Until now a post setting was either free input or a fixed list from the manifest. No setting could depend on the connected account.

## Decision

**One Pinterest account is one channel, and the board is a required post setting whose options come from the account.**

- **Contract:** a manifest may define `accountSettingOptions?(capabilities)`. It returns, per setting key, a list of `{value, label}` built only from the account's stored `capabilities`. It makes no network call.
- **Source of the options:** `connectFinish` puts them into the account's `capabilities` (for Pinterest: the public boards, id and name, at most 500, sorted by name). A reconnect replaces them.
- **Channels list:** the API returns the options with each channel. The composer renders such a setting as a select.
- **Validation:** the settings schema checks the value's shape only. A value that is no longer valid at the network fails at publish with a permanent error; the stored list may be stale, so the server doesn't reject on it.
- **ADR-0062 is untouched.** The picker stays limited to providers whose account credentials hold no secret.

## Options considered

- **Chosen:** the decision above.
- Rejected: board = channel with the picker, plus a refresh that updates every credential row of one grant under one lease. It changes the publish refresh path and lets a refresh token wait in `ephemeral_kv`.
- Rejected: board = channel, each row refreshed on its own. It relies on old refresh tokens staying valid, which Pinterest doesn't document.
- Rejected: loading the boards live when the composer opens. It would be the first provider call made from a read route, with its own rate-limit and failure handling.

## Consequences

- One credential row per Pinterest account; no shared grant.
- A board created after connect appears only after a reconnect. A scheduled refresh of the list can be added later without changing the contract.
- Pinterest's developer guidelines (checked 2026-11-17) say an app may not store information read through the API and should call the API each time. The stored board list (ids and names) goes against that wording. The risk is accepted: it is the same kind of data as the account name every channel stores, and it is replaced or deleted with the account.
- Other providers with a per-account target (for example a subreddit list) can use the same hook.
- Revisit when: stale lists cause failed posts in practice, or a provider needs options too large to store with the account.
