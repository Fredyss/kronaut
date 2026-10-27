# ADR-0039: Server-side AI has zero tools

- **Status:** Accepted
- **Date:** 2026-10-21
- **Deciders:** Frederik Schlentc
- **Area:** Identity, agents & security
- **Spec:** [Security](../architecture/06-security.md)

## Context

Prompt injection can't trigger side effects; no LLM cost or prompt debt for us.

## Decision

**Server-side AI has zero tools.** Output is a Zod-structured draft only, tagged by origin; agent content always needs approval. The user's own agent writes copy via MCP (the user's own agent is the primary AI path)

## Options considered

- **Chosen:** the decision above.
- Rejected: side-effecting AI chat
- Rejected: built-in campaign compiler in v1

## Consequences

- Revisit when: No known trigger.
