# ADR-0065: Kronaut stores Pinterest analytics despite the no-storage guideline

- **Status:** Accepted
- **Date:** 2026-11-23
- **Deciders:** Frederik Schlentc
- **Area:** Providers, analytics
- **Spec:** [Publishing pipeline](../architecture/05-publishing-pipeline.md#analytics), [Provider facts](../reference/provider-facts.md)

## Context

Analytics keeps snapshots of each published post's counts and a daily follower count per channel (ADR-0037), so charts can show how a post grew. Pinterest's API gives a Pin's metrics (`GET /v5/pins/{pin_id}/analytics`) and the account's `follower_count` (`GET /v5/user_account`), both with scopes Kronaut already holds.

Pinterest's developer guidelines (P7, checked 2026-11-17) say an app may not store information read through the API; the only exception is campaign analytics for the app's own account. Storing Pin snapshots and the follower count goes against that wording. ADR-0063 accepted the same risk for the stored board list.

## Decision

**Kronaut stores Pinterest Pin metrics and the follower count like every other provider's analytics.**

- Pin metrics are pulled on the usual schedule and written as `post_metric_snapshots`; the follower count goes into `account_daily_metrics`.
- The data stays in the workspace that published the Pin. Pinterest's `dataRetention` purge (ADR-0060) deletes it with the channel's credentials and profile once the channel has been disconnected or lapsed for that long.
- No other Pinterest data is stored for analytics.

## Options considered

- **Chosen:** the decision above.
- Rejected: reading Pinterest metrics live on each page view, without storing them. Charts would have no history, and every view of the analytics page would spend the account's API quota.
- Rejected: no Pinterest analytics. It leaves out a provider whose metrics the API offers with the scopes already granted.

## Consequences

- Pinterest channels get the same charts and follower counts as other providers.
- Pinterest's Standard-access review may object to the stored data. If it does, turning off `capabilities.analytics` in the manifest stops the pulls.
- Revisit when: Pinterest's review or a policy notice objects, or the guideline adds an exception that covers this use.
