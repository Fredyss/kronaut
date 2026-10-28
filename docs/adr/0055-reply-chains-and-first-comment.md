# ADR-0055: Reply chains and first comment

- **Status:** Accepted
- **Date:** 2026-10-28
- **Deciders:** Frederik Schlentc
- **Area:** Publishing, providers, editor
- **Spec:** [Provider contract](../architecture/03-provider-contract.md), [Data model](../architecture/04-data-model.md), [Publishing pipeline](../architecture/05-publishing-pipeline.md), [Frontend](../architecture/08-frontend.md)

## Context

Phase 1.1 takes reply chains and the first comment (ADR-0052). ADR-0033 gives every variant an ordered item list. The code names the roles `main`, `thread` and `comment`; ADR-0033's "reply" and "first_comment" are the same two roles.

Half of the stack is ready:

- `variant_items` and `destination_items` already accept `thread` and `comment` rows.
- The frozen snapshot carries every item into the content hash.
- `destination_items` has a state, a `provider_state`, a `remote_id` and a `reply_to_remote_id` for each item.
- [Publishing pipeline](../architecture/05-publishing-pipeline.md) already specifies per-item states: resume from the last confirmed item, and an unconfirmed middle item stops the chain.
- Send again re-freezes a failed destination without re-sending a confirmed part.

Everything that sends is single-item:

- The API takes exactly one item.
- The engine fails a longer list with `thread_unsupported`.
- `PublishOutcome` carries one remote id, and every provider rejects a non-`main` item.
- No provider declares chain support, although [Provider contract](../architecture/03-provider-contract.md) promises it.

## Decision

**The engine publishes a destination's items one at a time, in position order, calling the provider's `publish` once per item. Each item has its own write-ahead, checkpoint state, outcome and verify. A provider declares per post type whether it takes reply items and a first comment.**

### Items

- A variant's list is one `main` item at position 0, then zero or more `thread` items, then at most one `comment` item, which comes last. There are at most 25 items.
- A `thread` item is a reply to the item before it. A `comment` is a comment on, or reply to, the `main` item, published after the chain.
- A `comment` has text only. A `thread` item takes the media its post type allows for a reply.
- Text limits apply to each item separately.

### Manifest

`PostTypeSpec` gains two optional fields:

- `thread: {maxItems, media}`: the number of reply items allowed after the main one, and the media limits for each.
- `comment: {text, steps}`: the text limits and the steps of the first comment, which may use a different endpoint from the post.

The `thread` items reuse the post type's `steps` and `text`. A post type without the field doesn't take that role.

### Provider contract

- `publish(ctx, input)` keeps its signature. `input.items` holds only the item being sent, with its `role` and `position`.
- `input.state` is that item's checkpoint state: the item's `destination_items.provider_state`.
- `input.chain` lists the items already confirmed: `{position, role, remoteId, anchor}`. The parent is the last of them, and the root is the `main` one.
- `PublishOutcome.published` gains an optional `anchor`: a small string record the provider needs to reply to the item later, such as a Bluesky CID. The engine stores it on the item and hands it back in `input.chain`.
- `verify` and `poll` get the same per-item input.
- A provider still never touches the database. It must reject a role its manifest doesn't declare.

### Engine

- **One item per claim.** A claim publishes exactly one item: the lowest-position item that isn't `confirmed` or `skipped`. It goes through the existing single-destination flow (write-ahead, verify, refresh, lease and plan) as one attempt.
- **Between items:** when an item is confirmed and pending items remain, the destination goes `publishing → retry_wait/chain_next` with `run_at = now`, and the job is re-queued at once. The next claim publishes the next item. `chain_next` is exempt from the deadline, like everything after the main item.
- Each item gets its own write-ahead (`send_started_at` and `publish_attempts.item_position`) and its own settle.
- Each item takes one unit from the rate buckets.
- The deadline (`deadline_at`, `late_window_exceeded`, `rate_limit_beyond_deadline`) gates only the `main` item. Once the main item is confirmed, the deadline checks are skipped for every later item, at claim and in retry planning, and the rest of the chain is sent even past the deadline.
- Retries are bounded per item, not per chain: confirming an item resets the destination's `attempt_count` to 0, and the claim of the next item is counted. So each item gets the usual `MAX_ATTEMPTS` (6) sends. The async give-up clock likewise starts from the current item's own attempts.
- When the `main` item is confirmed, the destination gets its `remote_id`, `remote_url` and `published_at` at once. Later items never overwrite them. The destination becomes `published` only when the last item is confirmed.
- An item's outcome maps to the destination as follows:

| Item outcome | Item | Destination |
|---|---|---|
| `published` | `confirmed` | `retry_wait/chain_next` (`run_at = now`) while items remain; after the last, `published` |
| `pending` | stays `sending` | `retry_wait` or `verifying/provider_processing` as for a single post; the claim resumes at this item |
| `transient`, `rate_limited`, `auth_*` before the item's public step | back to `pending` | `retry_wait` or `blocked` as for a single post, but with no deadline once the main item is confirmed; resumes at this item |
| `ambiguous` after the item's public step | `unconfirmed` while verifying | `verifying` for this item; if still unconfirmed, the destination goes to `unconfirmed` and the chain stops |
| `permanent` on the `main` item | `failed` | `failed/permanent_error`, as today |
| any outcome that would fail the destination, on a later item (`permanent`, attempts exhausted, async give-up, or a claim-time check such as a changed account capability) | `failed`; the later items stay `pending` | **`failed/thread_incomplete`**, keeping the main post's `remote_id`, `remote_url` and `published_at` |

- `thread_incomplete` is a new `failed` reason. The migration inserts `('failed','thread_incomplete')`, and `('retry_wait','chain_next')` for the hop between items, into `destination_state_reasons`, which the destinations' reason foreign key checks. There is still no partially published destination state; the per-item states carry the detail.
- **Post summary.** `trg_publish_summary` keeps counting a `thread_incomplete` destination as `failed`: the post needs the user's attention, so `completed_failed` or `completed_partial` is right. The `post.completed` payload gains an `incomplete` count, the subset of `failed` that has a live main post, so consumers can tell a live but incomplete post from one that never went out.
- Send again resumes a `thread_incomplete` destination from its first unconfirmed item. A `sending` or `unconfirmed` item still needs `acknowledgeDuplicate`, as today.
- The `destination.failed` webhook and notification fire once. The payload names the failed item's position and includes the main post's link.

### Networks without chain support

- If a destination's post type doesn't declare `thread`, its `thread` items are frozen as `skipped`, and only `main`, plus the `comment` if declared, is sent. The same goes for a `comment` on a post type without `comment`.
- Compose shows this on the destination ("Facebook will publish the main post only") and doesn't block submitting.
- A destination's variant can still drop or rewrite items through the existing per-destination customization.

### API and compose

- `items` on create, update and variants becomes 1–25 entries, validated as main, then threads, then at most one comment. The checks reuse `@kronaut/compose` and its existing rules: no media on a comment, text limits per item.
- `destination_items` gets the missing CHECKs (`position >= 0`, and `position = 0` exactly when `role = 'main'`), added `NOT VALID` and then validated.
- Compose edits an ordered list: the main post, "Add reply" and "Add first comment". Each item has its own text, media, counters and issues, and the preview renders the chain.

### Rollout

1. This ADR, plus the 03, 04, 05 and 08 doc updates.
2. Contract, engine, API and migration. No provider declares the fields yet, so nothing user-visible changes. Includes the `thread_crash_after_part_3` reliability test.
3. Compose: the item list.
4. Reply chains on Bluesky, Mastodon and Threads, after their facts are verified.
5. First comment on Instagram, Facebook and LinkedIn, after their facts are verified.

Bluesky, Mastodon and Threads don't declare `comment`: a reply there is a `thread` item.

## Options considered

- **Chosen:** the engine drives the chain one item per `publish` call, with per-item state, and a later item's failure gives `failed/thread_incomplete`.
- Rejected: the provider publishes the whole chain in one call. Resume would need each provider to track the parts itself, a crash after part 3 would re-send parts 1–3, and per-item verify would be impossible. This breaks the pipeline's per-item rules.
- Rejected: `published` with a warning when a later item fails. The calendar would look clean, but an incomplete chain would be easy to miss, and nothing would ask for a send again.
- Rejected: a `partially_published` destination state. It was already turned down for posts (ADR-0031), and the per-item states plus `thread_incomplete` carry the same information without another state to plan for.
- Rejected: a separate `comment` role on Bluesky, Mastodon and Threads. There it would only be a reply under another name.

## Consequences

- The provider contract changes for every provider. Existing providers keep working unchanged, because `items` still holds one `main` item for a single post.
- A chain spends one rate-limit unit per item, and on Threads it counts towards the 1,000 replies per 24 h.
- `failed/thread_incomplete` is the first failed destination that has a live post. Lists, filters and the destination screen must show its link and per-item states, not just "failed".
- `list_recent_match` verify must match a reply by its parent as well as its text.
- Revisit when: a network needs replies sent out of order or in parallel; quote posts or polls are added; or a network offers an atomic multi-post endpoint.
