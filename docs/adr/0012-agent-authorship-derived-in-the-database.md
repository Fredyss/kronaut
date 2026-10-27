# ADR-0012: Agent authorship derived in the database

- **Status:** Accepted
- **Date:** 2026-10-21
- **Deciders:** Frederik Schlentc
- **Area:** Content & approval
- **Spec:** [Security](../architecture/06-security.md)

## Context

Blocks the laundering path "agent edits, human saves a checkpoint, schedules without approval".

## Decision

**Agent authorship is derived in the DB** from `app.actor` (trigger: `posts.agent_dirty`, sticky `agent_content` per destination). `CHECK agent_content → approval_required`

## Options considered

- **Chosen:** the decision above.
- Rejected: an app-supplied `created_by`

## Consequences

- Revisit when: No known trigger.
