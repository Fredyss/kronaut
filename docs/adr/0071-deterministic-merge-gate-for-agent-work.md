# ADR-0071: Deterministic merge gate for agent work

- **Status:** Accepted
- **Date:** 2026-11-26
- **Deciders:** Frederik Schlentc
- **Area:** Identity, agents & security
- **Spec:** [Contributing](../../CONTRIBUTING.md), [Operations](../architecture/11-operations.md)

## Context

AI agents now write, review and fix most pull requests. The maintainer still approves every step, including merges of small task PRs whose plan was settled in an ADR before the work began. That keeps the maintainer in every loop without adding safety. An agent's own judgment can't be the gate either, because it isn't predictable. Agents also push and post reviews under the maintainer's GitHub account today, so GitHub can't tell a human approval from an agent's, or the agent that wrote a change from the one that reviewed it.

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
2. The reviewer identity has posted a verdict of `OK` for the exact head commit SHA. A verdict for an older commit, or from any other account, counts for nothing. Thread state isn't read: the builder can resolve threads, so only a fresh `OK` after the fixes opens the gate.
3. The PR changes no one-way-door path, or the maintainer approved it as code owner.

**One-way-door paths**, kept in `.github/CODEOWNERS` with the maintainer as owner. A task PR that touches any of them waits for the maintainer, as `main` does:
- `packages/db/schema/**`, `packages/db/migrations/**`
- `docs/adr/**`
- `.claude/**`, `.github/**`, `.devcontainer/**`, `infra/**`
- `apps/server/src/identity/auth/**`, `packages/credentials/**`, `packages/egress/**`, the entitlements module
- Everything that decides what CI checks: `tools/**`, `biome.json`, `.jscpd.json`, `.fallowrc.json`, `.gitleaks.toml`, `tsconfig*.json`, `vitest*.config.ts`, `**/package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `apps/server/src/base/http/public-routes.json`
- `LICENSE.md`, `NOTICE`, `CLAUDE.md`, `AGENTS.md`
- Root files: `/*` (any file directly at the repository root).

**Enforcement:**
- **`main` ruleset:** a PR and one approval from a code owner (the maintainer) are required, plus the CI checks. Stale approvals are dismissed on every push, and the most recent push must be approved by someone other than its pusher, so the approval covers the head commit that merges. No bypass for either agent identity.
- **`feature/*` ruleset:** a PR plus the CI checks and `risk-gate` are required, and code-owner review is required. `CODEOWNERS` lists the maintainer for every one-way-door path, so a task PR touching one waits for the maintainer by GitHub's own rule; other task PRs need no human approval. GitHub reads `CODEOWNERS` from the base branch, so a PR can't remove itself from it.
- **`risk-gate` is a ruleset-required workflow pinned to `main`:** GitHub runs the copy on `main`, so a PR that edits the workflow can't make its own gate pass.
- **`risk-gate` workflow:** accepts a verdict only from the reviewer identity's comment that names the head SHA. It runs on `pull_request`, never `pull_request_target`, and executes no code from the PR.

**Agent identities,** two of them, so the writer can't grade itself:
- **Builder:** a GitHub App named for Claude. Agent sessions push, open PRs, reply and resolve threads as the builder. It has `contents` and `pull_requests` write on this repository only.
- **Reviewer:** a second GitHub App that only the review routine holds. It posts the verdict comments. Builder sessions never get its credentials, so the builder can't write a verdict.
- The review routine reviews every PR the builder opens; its author filter includes the builder App.
- The maintainer's account approves and merges only by hand, so its approval always means a human.
- Neither App is on any bypass list.

## Options considered

- **Chosen:** path list plus CI plus review verdict, enforced by GitHub rulesets and auto-merge.
- Rejected: an agent decides when a change is safe to merge. Its judgment isn't repeatable, and a prompt injection could steer it.
- Rejected: Claude Approvals policy files. They need a Claude Team or Enterprise organization; revisit if the project gets one.
- Rejected: the maintainer approves every task PR. That's today's process: safe, but every loop waits on one person.

## Consequences

- Task PRs inside an approved feature merge without the maintainer. The maintainer reviews one feature branch instead of each step.
- A change to the gate itself (`.github/**`, `CODEOWNERS`, the workflow) is a one-way door, so the gate can't loosen itself.
- Until the App exists and the rulesets are in place, nothing changes: the maintainer merges everything.
- The gate is only as trustworthy as the reviewer App's secret. It lives only where the review routine runs, never in a builder session or the dev container.
- Revisit when: a gated path proves too broad or too narrow in practice, a second human maintainer joins, or Claude Approvals becomes available.
