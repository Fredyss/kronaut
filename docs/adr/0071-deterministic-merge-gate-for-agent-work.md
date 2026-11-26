# ADR-0071: Deterministic merge gate for agent work

- **Status:** Accepted
- **Date:** 2026-11-26
- **Deciders:** Frederik Schlentc
- **Area:** Identity, agents & security
- **Spec:** [Contributing](../../CONTRIBUTING.md), [Operations](../architecture/11-operations.md)

## Context

AI agents now write, review and fix most pull requests. The maintainer still approves every step, including merges of small task PRs whose plan was settled in an ADR before the work began. That keeps the maintainer in every loop without adding safety. An agent's own judgment can't be the gate either, because it isn't predictable. Agents also push and post reviews under the maintainer's GitHub account today, so GitHub can't tell a human approval from an agent's.

## Decision

**Branches:**
- `main` ← `feature/<name>` ← task PRs.
- A feature is one approved plan item. Its task PRs target `feature/<name>`, and the feature branch reaches `main` through one PR.

**Planning flow,** following the `mattpocock-skills` engineering flow:
1. The maintainer settles the open decisions (grilling, an ADR, a plan entry). This is the human gate before work starts.
2. A spec and its tickets, each ticket declaring what blocks it (`to-spec`, `to-tickets`).
3. The tickets are built on the feature branch as a task graph: every ticket whose blockers are done is ready, and ready tickets run in parallel (`implement-spec`). Each ticket is one task PR.
4. A code review of the whole feature branch, then the PR into `main` with the `pr` body.

**Who merges:**
- **Task PR into `feature/*`:** an agent may request a merge with `gh pr merge --auto`. GitHub merges once every gate condition holds. No agent judgment is involved.
- **`feature/*` or any other PR into `main`:** the maintainer reviews and merges, always.

**Gate conditions for a task PR**, all required:
1. Every CI job is green.
2. The latest review routine verdict on the head commit is `OK`, with no open P1 or P2 finding.
3. Every review thread is resolved.
4. The `risk-gate` check passes: the PR changes no path on the one-way-door list.

**One-way-door paths**, kept in one file, `.github/risk-gate-paths.txt`. A task PR that touches any of them waits for the maintainer, as `main` does:
- `packages/db/schema/**`, `packages/db/migrations/**`
- `docs/adr/**`
- `.claude/**`, `.github/**`, `.devcontainer/**`, `infra/**`
- `apps/server/src/identity/auth/**`, `packages/credentials/**`, `packages/egress/**`, the entitlements module
- `LICENSE.md`, `NOTICE`, `CLAUDE.md`, `package.json`, `pnpm-lock.yaml`

**Enforcement:**
- **`main` ruleset:** a PR and one approval from a code owner (the maintainer) are required, plus the CI checks; no bypass for the agent identity.
- **`feature/*` ruleset:** a PR plus the CI checks and `risk-gate` are required; no human approval.
- **`risk-gate` workflow:** compares the changed paths with the list and reads the review routine's verdict marker. Path matching is plain globbing, so the result is the same on every run.

**Agent identity:**
- Agents push, comment and review as a GitHub App named for Claude, not as the maintainer.
- The maintainer's account approves and merges only by hand, so its approval always means a human.
- The App has `contents` and `pull_requests` write on this repository only, and isn't on any bypass list.

## Options considered

- **Chosen:** path list plus CI plus review verdict, enforced by GitHub rulesets and auto-merge.
- Rejected: an agent decides when a change is safe to merge. Its judgment isn't repeatable, and a prompt injection could steer it.
- Rejected: Claude Approvals policy files. They need a Claude Team or Enterprise organization; revisit if the project gets one.
- Rejected: the maintainer approves every task PR. That's today's process: safe, but every loop waits on one person.

## Consequences

- Task PRs inside an approved feature merge without the maintainer. The maintainer reviews one feature branch instead of each step.
- A change to the gate itself (`.github/**`, the path list) is a one-way door, so the gate can't loosen itself.
- Until the App exists and the rulesets are in place, nothing changes: the maintainer merges everything.
- Revisit when: a gated path proves too broad or too narrow in practice, a second human maintainer joins, or Claude Approvals becomes available.
