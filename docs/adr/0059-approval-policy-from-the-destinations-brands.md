# ADR-0059: Approval policy comes from the destinations' brands

- **Status:** Accepted
- **Date:** 2026-11-04
- **Deciders:** Frederik Schlentc
- **Area:** Content & approval
- **Spec:** [Security](../architecture/06-security.md), [Data model](../architecture/04-data-model.md)

## Context

ADR-0042 gives each brand an optional override of the workspace approval policy. Today the override is looked up through `posts.brand_id`, which no write path sets, so overrides never apply. Once channels belong to brands, one post can go to channels of several brands. If such a post used only one brand's policy, or the workspace policy, adding a channel could loosen approval for another brand's channels.

## Decision

- **Policy sources:** the policy that applies to a post combines one policy per brand among its destinations' channels, read live.
  - Each brand uses its override if it has one, otherwise the workspace policy.
  - A channel without a brand uses the workspace policy.
  - When there's no workspace row, the strictest default applies.
- **Combining:** the strictest value wins in each field.
  - The mode is `required` if any source requires it.
  - The approval count is the highest among the sources that require approval.
  - Self-approval is allowed only if every source allows it.
  - The reschedule tolerance is the lowest.
- **No destinations:** a post without destinations uses the workspace policy.
- **Post brand:** `posts.brand_id` is derived. It's the shared brand when all destinations' channels share one, and null otherwise.
  - It's recomputed whenever a post's destinations change.
  - When a channel's brand changes, it's recomputed only for that channel's unfinished posts. Settled and canceled posts keep their brand, and `brand_id_at_freeze` keeps the history.
  - It's context for audit, never the policy key.
- **Brand filters:** they match a post that has at least one destination on a channel of that brand, read live. A mixed post appears under each of its brands.
- **Assigning a brand:** it changes access scope (ADR-0014) and policy, so it's owner/admin only through `channels:assign`, which is never grantable. Every assignment is audited with the old and new brand.
- **Open requests:** a stricter policy doesn't void them. The approval floor applies when a request is approved.
- **DB guards:** the floors in `trg_approval_request_guard` and `trg_approval_dest_tolerance` use the same combination over the destinations, replaced in a migration.
- **What stays the same:** tightening applies at claim, and loosening never auto-approves (ADR-0042).

## Options considered

- **Chosen:** the decision above.
- Rejected: a brand picker in the composer, with one brand per post. It's stricter UX, but agencies post shared announcements across clients.
- Rejected: the policy from `posts.brand_id`, falling back to the workspace on a mix. Adding another brand's channel would loosen approval.

## Consequences

- No combination of channels can lower the approval bar below any of its brands' policies.
- Moving a channel to another brand changes the policy live.
  - An open request is checked against the live floor when it's approved.
  - At claim, a scheduled post that was exempt (mode `none`) is blocked if the new policy requires approval (ADR-0042).
  - A request that's already approved stays approved.
- Revisit when: per-brand roles arrive (ADR-0028), since then the approvers may differ per brand.
