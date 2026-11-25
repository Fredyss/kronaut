# ADR-0066: A provider may forbid repeats and warn on the same text across channels

- **Status:** Accepted
- **Date:** 2026-11-25
- **Deciders:** Frederik Schlentc
- **Area:** Providers, scheduling, composer
- **Spec:** [Provider contract](../architecture/03-provider-contract.md), [Publishing pipeline](../architecture/05-publishing-pipeline.md)

## Context

X's Developer Policy (docs.x.com/developer-terms/policy, checked 2026-11-23) says: "Never post identical or substantially similar content across multiple accounts." X's automation rules on help.x.com also limit duplicate posts, but that page returns 403 to fetchers, so its wording is unverified.

Two Kronaut jobs post the same content again without a person choosing it: the evergreen fill and recurring series. Both can target an X channel today. A person can also send one post with the same text to several X channels.

[ADR-0064](0064-manual-only-providers.md) `manualOnly` is too strict for X: it also blocks RSS queue mode, and each feed item is new content.

## Decision

**A manifest may set `noRepeats: true` and `warnDuplicateText: true`. X sets both.**

- **`noRepeats`:** Kronaut never posts the same content again to that provider's channels by itself.
  - **Evergreen:** the fill job leaves such channels out of the pool. Marking a post evergreen still works for its other channels.
  - **Recurring series:** scheduling or requesting approval with a repeat fails with `repeat_blocked` at `destinations.<n>`. If someone adds such a channel to an occurrence later, the series job doesn't schedule it and pauses the series (`advance_failed`), like ADR-0064.
  - **What stays allowed:** RSS feeds in either mode, a person scheduling or queueing one post, CSV import and API grants.
- **`warnDuplicateText`:** the web warns, and never blocks, when two or more destinations of such a provider would get the same text. "Same" means equal after NFC, trimming and collapsing whitespace; "substantially similar" isn't measurable, so it isn't checked.
  - **Composer:** a warning on the post when its destinations of that provider share a text.
  - **RSS feeds:** a warning on the feed form when it has two or more channels of that provider, because every item goes to each of them unchanged.
  - The server doesn't check it; scheduling still succeeds.
- **Channels list:** each channel carries `noRepeats` and `warnDuplicateText`, so the web can explain the limit before the server rejects it.

## Options considered

- **Chosen:** the decision above.
- Rejected: setting `manualOnly` on X. It blocks RSS queue mode, which posts new content each time.
- Rejected: blocking the same text across X channels. The person decides; the policy risk is theirs, and a block would stop legitimate posts with short identical text.
- Rejected: one flag for both. A network can forbid repeats without caring about cross-account copies, and the reverse.

## Consequences

- An X channel can't be filled from evergreen or a repeat. People who want recurring X posts must schedule each one.
- The duplicate check is text-only: two posts with the same text and different images still warn.
- Other providers with the same rules set the flags.
- Revisit when: X publishes automation rules that cover RSS-style posting, or a measurable similarity rule.
