# ADR-0058: Short links swapped in at the first claim

- **Status:** Accepted
- **Date:** 2026-11-04
- **Deciders:** Frederik Schlentc
- **Area:** Content & approval, publishing pipeline
- **Spec:** [Publishing pipeline](../architecture/05-publishing-pipeline.md), [Data model](../architecture/04-data-model.md), [Security](../architecture/06-security.md), [Shortener facts](../reference/shortener-facts.md)

## Context

Phase 2 adds a short-link adapter for Dub and Kutt. A workspace connects one shortener, and links in a scheduled post are shortened automatically, one short link per channel and link, with UTM tags per channel.

Freezing a revision happens in one transaction that locks the post and its destinations (Steps 1, ADR-0007). Creating a short link is a network call to a third-party or self-hosted service, and a CSV import can freeze 500 posts in one request. A network call inside the freeze would hold locks for as long as the shortener answers, and make scheduling fail whenever the shortener is down.

Approval binds the per-destination content hash (ADR-0010), and the claim compares that hash with a re-hash of the frozen revision before anything is sent. A short link isn't known until the shortener answers, and it isn't deterministic.

## Decision

**The long link is the content.** The frozen revision, the content hash, preflight and the approval comparison all see the links as written. A short link isn't content: it redirects to that same link, with UTM tags added. `CONTENT_HASH_V` and `SNAPSHOT_V` don't change.

**One shortener per workspace:** `link_shorteners` holds the provider (`dub | kutt`), its API base URL (`https`; Dub is the hosted `https://api.dub.co` only, since its docs give no self-hosted API; Kutt is the hosted `kutt.to` or a self-hosted instance, always named by the user), an optional custom domain, and the API key sealed through the keyring.
- Owners and admins connect, change and remove it (`settings:write`, session only), and each change is audited.
- The key never reaches a response, a log, a job payload or an audit event.
- Calls go through `packages/egress`. The shortener's host is user-supplied, so the call is pinned and range-checked like a media import URL.

**Per channel:** `social_accounts.shorten_links` (default `true`) turns it off for one channel. Freezing records the channel's choice in the destination snapshot as an optional `shorten` key, left out when false, so older rows parse as before. Changing the switch leaves a frozen destination alone, as a signature change does.

**What's shortened:** each `http` or `https` link that the compose link rule (`packages/compose`, the one text counting uses) finds in the text of the items a destination will send. Link-card settings and media are left alone.

**Mapping:** `short_links` holds one row per destination and long link: `(workspace_id, destination_id, url_sha256)` is unique. Each row has:
- the target, which is the long link plus `utm_source=<provider>`, `utm_medium=social` and `utm_campaign=kronaut` unless the link already has a `utm_` parameter;
- the short URL and the shortener's link id;
- a state of `pending`, `ready` or `failed`, with the failure kind.

**Creation, outside any transaction:**
- Freezing a destination with `shorten` enqueues a `short_links` job for it. The payload is ids only (ADR-0046), and enqueueing is a database write in the same transaction, so freezing makes no network call.
- The job reads the frozen revision, finds the links and creates each missing one. Dub links carry an `externalId` derived from the destination and the long link; a `409` is resolved by reading the link by that id and checking its target. Kutt has no idempotency, so a crash between the call and the write can leave an unused extra link on the shortener, which is harmless (see [Shortener facts](../reference/shortener-facts.md)).
- Rescheduling freezes again and enqueues the job again; links already `ready` are reused.

**The swap, at the first claim:**
- The publish job first ensures this destination's links, outside any transaction, with a 10 s budget, so a job that never ran is covered.
- The claim then reads `ready` rows only.
- When the first claim freezes `destination_items.rendered_text`, each long link with a `ready` row is replaced by its short URL. If an item's rendered text would then fail the post type's text limits, that item keeps its long links.
- Retries and send again reuse `rendered_text`, so a post never changes its links mid-send.

**Never blocking:** a shortener that's down, refuses a link or runs out of time means the long link is published as written, without UTM tags. The row records the failure kind, and the post page shows it. Shortening never fails, blocks or delays a post beyond the 10 s budget.

**Visible before publishing:** the post page and the approval view show each long link's short link once it exists, and "will be shortened when published" before that. An approver approves the long link, and the short one only redirects to it.

**GC:** `short_links` rows go 90 days after their destination reaches a final state. The links on the shortener stay, because published posts point at them.

## Options considered

- **Chosen:** keep the long link in the frozen content and the hash, create short links in a job after freezing, and swap them in when `rendered_text` is frozen at the first claim.
- Rejected: shortening inside the freeze transaction. It puts a network call under the post and destination locks, and makes scheduling, approval requests and CSV imports depend on the shortener.
- Rejected: shortening before freezing, in every scheduling entry point (composer, approval request, CSV import, RSS, evergreen, series). The hash would bind the short link, but scheduling would wait on the shortener and fail when it's down, and each entry point needs the same pre-step.
- Rejected: a "Shorten links" button that rewrites the draft. It's easy to forget, and RSS, CSV and owner-created posts never get it.

## Consequences

- Scheduling, approval and the hash stay as they are. Shortening is an add-on that can only fall back to the long link.
- The published text differs from the approved text in its links. The difference is limited to redirects to the approved targets plus UTM tags, and the approval view shows them.
- A shortener outage publishes long links without UTM tags, so analytics lose the per-network split for those posts.
- Revisit when: click stats are pulled from the shortener (a likely follow-up), a third shortener is added, a network rejects redirects, or approval must bind the short link itself.
