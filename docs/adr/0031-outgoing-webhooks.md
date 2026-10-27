# ADR-0031: Outgoing webhooks

- **Status:** Accepted
- **Date:** 2026-10-21
- **Deciders:** Frederik Schlentc
- **Area:** Publishing pipeline
- **Spec:** [Publishing pipeline](../architecture/05-publishing-pipeline.md)

## Context

An interoperable standard; receivers can dedupe and order.

## Decision

**Webhooks**: Standard Webhooks signing (`webhook-id/-timestamp/-signature`). Envelope `{id, type, created_at, api_version, workspace_id, data}` with no content or tokens; `sequence` = destination version; **a resend reuses the id**. Frozen event names: `destination.published|failed|unconfirmed|blocked|awaiting_manual`, `post.completed`, `post.approval_requested|approved|rejected`, `channel.needs_reauth|reconnected|expiring`, `provider_app.misconfigured`, `webhook.test`. Events are written in the finalize txn from Phase 0

## Options considered

- **Chosen:** the decision above.
- Rejected: a custom HMAC
- Rejected: `post.partially_published`

## Consequences

- Revisit when: No known trigger.
