# ADR-0068: A provider may set its own analytics schedule

- **Status:** Accepted
- **Date:** 2026-11-26
- **Deciders:** Frederik Schlentc
- **Area:** Providers, analytics
- **Spec:** [Publishing pipeline](../architecture/05-publishing-pipeline.md#analytics), [Provider contract](../architecture/03-provider-contract.md), [Provider facts](../reference/provider-facts.md)

## Context

Analytics pulls each published post 1 h, 6 h, 24 h, 3 days, 7 days and 30 days after publishing, and reads each channel's follower count once per UTC day (ADR-0037). Every provider follows that one schedule. Each read is free on every network Kronaut supports so far, within rate limits.

X is different (provider facts, checked 2026-11-26):

- **Cost.** X bills the app's credit balance per resource returned: $0.005 per post read and $0.010 per user read. Six reads of each post cost about $0.03, twice the $0.015 it costs to publish it. A daily follower read costs about $0.30 per channel per month. Since ADR-0067 the cost falls on whichever workspace or instance owns the app, but it is still charged.
- **Window.** The richer non-public and organic metrics are "only available for posts created within the last 30 days". Kronaut reads only `public_metrics`, but a 30-day pull would sit right on that edge if the non-public fields are added later.
- **Credits.** At zero credits X blocks every request of the app. Today any `permanent` failure ends a post's pulls, so a brief empty balance would end the pulls of every X post for good.
- **Deletion.** X's Developer Policy says: "you must delete or modify any content you have if it is deleted or modified on X", including content "made private or gained protected status". Kronaut keeps per-post metric snapshots after a post is gone at the network.

## Decision

**The provider manifest may carry an `analytics` block, `{pullHours?, followersEveryDays?, purgeOnMissing?}`, that overrides the default schedule for that provider only.**

- **Pull schedule:** `pullHours` lists the post pull offsets in hours after `published_at`: 1–6 whole hours, strictly rising, above 0 (checked by conformance; it fits the `step` CHECK of 0–5). The first pull row is seeded at the first offset. A post type's `analytics.windowHours` still drops the offsets at or past its window and must cover the first offset. Without the block, the offsets stay 1, 6, 24, 72, 168 and 720.
- **Follower cadence:** `followersEveryDays` reads the follower count once every that many UTC days (a whole number, at least 1). The default is 1, so every other provider still reads once per UTC day.
- **Spent credits:** a `permanent` `credits_depleted` failure during analytics stops the channel for the run, like a rate limit. Its post pulls and its follower read move 24 h ahead without using an attempt. Publishing is unchanged: a post still fails with `credits_depleted`.
- **Purge on missing:** with `purgeOnMissing`, a post that the network itself reports missing (`permanent` `not_found` for that one post, not a failed request) ends its pulls and deletes that destination's `post_metric_snapshots`.
- **X:** `pullHours` 24, 168 and 696 (1, 7 and 29 days), `followersEveryDays` 7, `purgeOnMissing` set. It reads `public_metrics` only. A post that X reports as `resource-not-found` or `not-authorized-for-resource` counts as missing.

## Options considered

- **Chosen:** the decision above.
- Rejected: X's own `windowHours` on its post type. A window can only drop late offsets; X needs fewer and different ones, and the follower cadence isn't per post type.
- Rejected: one cheaper schedule for every provider. Free networks would lose their early data points for no saving.
- Rejected: a schedule set by each workspace. Nobody has asked for it, and the cost question is per provider.
- Rejected: ending a post's pulls on `credits_depleted`, as for any `permanent` failure. One empty balance would end the analytics of every X post for good.
- Rejected: keeping the snapshots of a deleted X post. That conflicts with X's Developer Policy.

## Consequences

- An X post costs $0.015 in reads over its life instead of about $0.03, and a channel's follower reads about $0.04 a month instead of $0.30.
- X charts have three points per post, the first a day after publishing.
- A post deleted or made private on X loses its stored metrics at the next pull; one deleted after the last pull keeps them. The `dataRetention` purge (ADR-0060) still covers disconnected and lapsed channels.
- A manifest change to a schedule leaves existing pull rows on their step: a step past the new schedule ends without a read, as for a narrowed window.
- Revisit when: X's pricing or its non-public metrics window changes, or a provider needs a schedule per post type.
