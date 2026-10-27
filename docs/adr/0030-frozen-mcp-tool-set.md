# ADR-0030: Frozen MCP tool set

- **Status:** Accepted
- **Date:** 2026-10-21
- **Deciders:** Frederik Schlentc
- **Area:** Identity, agents & security
- **Spec:** [Security](../architecture/06-security.md)

## Context

Names say that scheduling needs approval.

## Decision

**MCP tools (frozen names)**: `get_brand_context`, `list_channels`, `list_account_groups`, `draft_campaign`★, `update_draft`★, `add_media_from_url`★, `validate_draft`, `preview_post`, `request_approval`★, `schedule_approved_post`★, `get_publish_status`, `cancel_scheduled_post`, `get_post_metrics` (Phase 2). ★ = idempotency key required. Untrusted text is returned as `{untrusted:true, source, text}`. Never exposed: approve, publish_now, unpublish, connect, settings, grants

## Options considered

- **Chosen:** the decision above.
- Rejected: verb-first tool renames

## Consequences

- Revisit when: No known trigger.
