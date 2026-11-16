# ADR-0060: Provider data retention

- **Status:** Accepted
- **Date:** 2026-11-16
- **Deciders:** Frederik Schlentc
- **Area:** Providers, security, operations
- **Spec:** [Provider contract](../architecture/03-provider-contract.md), [Operations](../architecture/11-operations.md), [Publishing pipeline](../architecture/05-publishing-pipeline.md#analytics), [Data model](../architecture/04-data-model.md)

## Context

YouTube analytics (subscribers, video views, likes and comments) is the first provider data whose policies set a deadline for deleting it. The YouTube API Services Developer Policies (Y8, re-verified 2026-11-16) say:
- III.D.2.3: on revocation in the app, revoke at once and delete Authorized Data within 7 days (30 days when access is revoked from Google's security settings).
- III.E.4.b: statistics may be kept if authorization is re-checked at least every 30 days.
- III.E.4.c: other Authorized Data is refreshed or deleted within 30 days.
- III.E.4.g: a user's deletion request is met within 7 days.

Until now a disconnected channel kept its name, handle, profile URL and metrics for good; only its credentials were purged, after 30 days. Other networks set no such deadline, and their behaviour should not change.

## Decision

**Per-provider rule in the manifest:** `dataRetention?: {disconnectedDays, lapsedDays}`. YouTube sets `{disconnectedDays: 7, lapsedDays: 30}`. No other manifest sets it. Conformance requires whole days of at least 1.

**Purge:** the daily `credential_retention` task, per workspace through `sweep_workspaces` and `withTenant()`, purges each channel of such a provider that is `disconnected` for longer than `disconnectedDays` or `needs_reauth` for longer than `lapsedDays`, minus a margin of 2 days (measured from `status_changed_at`; never below 0). The manifest holds the policy figures; the margin covers the daily run interval plus one missed run, or the day it takes to flag a dead grant, so the purge lands inside the deadline. A purge:
- deletes its `account_credentials`;
- sets `handle`, `profile_url` and `provider_subject_id` to null and `display_name` to `''`, the same wipe as the Meta data deletion (ADR-0057);
- deletes its `account_daily_metrics`, and the `post_metric_snapshots` and `destination_metric_pulls` of its destinations;
- writes one `channel.data_purged` audit event.

It runs in batches of 100 channels per transaction and only touches a channel that still holds any of that data, so a second run does nothing and writes no audit event. The run summary counts `purgedAccounts`. Migration 36 grants `kronaut_app` `DELETE` on the three metric tables.

**What stays:** posts, `post_destinations` and their remote ids and permalinks. They are the user's own record of what Kronaut published for them, not data read from the API. A strict reading of III.D.2.3 could count a video id as Authorized Data; if Google's review says so, the purge also clears `remote_id` and `remote_url`.

**Re-check every 30 days:** the daily follower read of an `active` channel (`channels.list part=snippet,statistics mine=true`) is the authorization re-check of III.E.4.b. It also returns the channel's title and custom URL, so `accountMetrics` returns a `profile` and the server overwrites `display_name`, `handle` and `profile_url` while the channel is still `active`; that is the refresh of III.E.4.c. A channel whose token fails goes `needs_reauth` through the refresh path or a failed follower read, and is purged after `lapsedDays`.

**Siblings of a revoked grant:** one Google consent can connect several channels, and a later consent for another channel of the same Google account issues a new refresh token. Revoking any one token kills the whole grant between that account and the Cloud project, so every channel of it dies. Connect therefore asks for `openid` too and stores the ID token's `sub` (the Google account id) as `provider_subject_id` on each channel. After a successful revoke, the `revoke_credential` job flags every other `active` channel of the same provider and provider app (a `sub` is the same across Cloud projects, a grant isn't) in that workspace that has the revoked channel's `provider_subject_id`, or, for channels connected before the subject was stored, whose credentials share the grant (the runtime's `sharesGrant`; YouTube compares refresh tokens). The job runs only for a provider with both `sharesGrant` and `dataRetention`. Each goes `needs_reauth` with the `auth_revoked` incident and the status reason `grant_revoked`, fenced on its own credential version. The purge treats a `needs_reauth` channel with reason `grant_revoked` like a disconnected one and uses `disconnectedDays` (with the same margin). A refused revoke flags nobody.

**Reconnect:** connect overwrites the name, handle and profile URL, so a purged channel comes back whole. Metrics from before the purge are gone.

**Other providers:** unchanged. Without `dataRetention`, credentials are purged 30 days after disconnect and nothing else is deleted.

**UI:** the YouTube disconnect dialog says the channel's name and stats are deleted within 7 days of disconnecting (the policy figure; the margin makes it sooner).

## Options considered

- **Chosen:** the decision above.
- Rejected: one retention period for every provider. It would delete data other networks let Kronaut keep, and it changes behaviour nobody asked to change.
- Rejected: deleting the channel row on purge. Its destinations, posts and audit trail reference it, and reconnecting would lose the link to them.
- Rejected: also deleting remote ids and permalinks. It would erase the user's publish history for a reading the policies don't clearly require.

## Consequences

- A provider whose policies set deadlines declares them in its manifest; the purge needs no provider code.
- Metrics of a YouTube channel disconnected for 7 days are gone, even if it is reconnected later.
- A dead grant reaches `needs_reauth` two ways: the refresh path flags it, and so does the daily follower read of a provider with `dataRetention` when the read proves the grant or the channel gone: `auth_revoked`, or `permanent` with `channel_missing`. An expired access token (`auth_expired`) is left to the refresh path, and any other `permanent` failure (an unknown 4xx, schema drift, an egress block) only marks the read checked, because it can hit every channel at once. Either way `lapsedDays` then applies. Other providers keep only marking the read as checked.
- Known gap: the same Google account connected in another workspace holds the same grant but gets no sibling flag, because nothing links credentials across tenants. Its token fails at the next refresh or follower read, and it then gets `lapsedDays` (30 days), not 7. Accepted on purpose: linking them would need a new cross-tenant `SECURITY DEFINER` entry point (ADR-0056) for a rare setup. Revisit when installs commonly connect one Google account in several workspaces.
- Revisit when: Google's compliance audit reads the policies more strictly (remote ids), or another network sets a deadline the two fields can't express.
