# Kronaut

A self-hostable social media scheduler. TypeScript on Node 24, Postgres 17 as the only stateful service.

**Status:** Phase 2 in progress ([Roadmap](docs/architecture/09-roadmap.md)).

## Sources of truth (in priority order)

1. `docs/adr/`: one-way decisions. Never edit an accepted ADR; add a new one that supersedes it.
2. `packages/db/schema/v1.sql` plus `packages/db/migrations/` in order: the normative schema. `v1.sql` is the frozen, checksummed baseline (migration 1); never edit it, add a migration instead.
3. `docs/architecture/`: stack, contracts, pipeline, security, phases and ops. Start at its README.
4. `docs/reference/`: provider facts and the security and reliability test catalogues.

When a task conflicts with 1–3, stop and ask. Don't silently deviate.

## Clean-room rules (non-negotiable)

- Never read, fetch, paste or adapt source code, translations or assets from any third-party social media scheduler.
- Build only from this repo's docs and the **current official platform API docs**.
- Provider limits change. Re-verify `docs/reference/provider-facts.md` against the official docs before building a provider, and record the source URL and the date you checked.
- Never name other social media schedulers anywhere in the repo: code, docs, commits or comments.

## Invariants that code must not break

- **Network:** only `packages/egress` may call `fetch` or import undici.
- **Database access:**
  - Use `withTenant()` / `TenantDb` only; never import the raw db.
  - Cross-tenant work goes through the `SECURITY DEFINER` sweep functions.
- **Routes and authorization:**
  - Every route goes through `defineRoute({auth, action})` and `authorize()`.
  - Public routes must appear in the committed snapshot.
- **Providers:** never touch the DB. They return `ProviderError` kinds and declare each step's `effect`.
- **Publishing safety:** never auto-retry an ambiguous `public` step; it goes to `verifying`, then `unconfirmed`.
- **Agents and AI:**
  - No API key, MCP tool or agent can approve, connect channels or change policy.
  - Server-side AI has no tools.
- **Content storage and hashing:**
  - Store content as ProseMirror JSON, never HTML.
  - Normalize text to NFC.
  - Payloads that get hashed contain integers only.
- **Banned in code:** `dangerouslySetInnerHTML`, `Math.random` on the server, `MODE==='saas'` outside the entitlements module.
- **Time:** use Temporal (`temporal-polyfill`). Store wall time + IANA tz + UTC. Expand recurrence from local wall time.
- **UI text:** every user-visible string goes through Paraglide in **en, sk and cs**.
  - Count messages use plural variants.
  - Never build date formats by hand.
  - Write Slovak and Czech strings fresh; never copy them.
- **Schema changes:** text + CHECK, not pg enums. Migrations are expand/contract, with `lock_timeout`, `CONCURRENTLY` and `NOT VALID` + `VALIDATE`.
- **Secrets:** never in code, logs, responses or commits. The secret-canary test must stay green.

## Code style

- Adding a file, a feature folder or an import between features: read [Code structure](docs/architecture/13-code-structure.md) first.
- No code comments or licence headers. The only exception is a comment for a non-obvious *why* (for example, an upstream-bug workaround).
- TS strict with `erasableSyntaxOnly` (Node runs `.ts` directly): no enums, namespaces or parameter properties. Relative imports use the `.ts` extension.
- Biome formats and lints; match the surrounding code.
- Size limits (Biome): 300 lines per source file (500 for tests), 60 lines and cognitive complexity 15 per function, 4 parameters. No file is exempt; split a file before it crosses a limit.
- Don't "clean up" odd-looking constants, orderings or names without asking. Some are deliberate.
- Package boundaries follow [Repo layout](docs/architecture/02-repo-layout.md); `apps` depend on `packages`, never the reverse.
- Every PR gets a review in a fresh session before it counts as ready for merge.

## Commands

- `pnpm check`: Biome + jscpd (≤ 1% duplication; `pnpm dup` lists the clones) + `tsc -b` + Vitest, including the structure rules in `tools/lint/`. It must pass before any task counts as done.
- `pnpm format`: apply Biome fixes.
- `pnpm typecheck`, `pnpm test`, `pnpm lint`: the parts of `check`.
- `pnpm test:e2e`: builds the web app, then runs the Playwright smoke suite in `apps/server/e2e/` against the real server and a testcontainers Postgres. It needs Docker and a Chromium from `pnpm --filter @kronaut/server exec playwright install chromium`.
- Self-hosted stack: [Self-hosting guide](docs/guides/self-hosting.md). Local Postgres only: run `infra/compose/init-secrets.sh`, copy `infra/compose/.env.example` to `.env`, then `docker compose -f infra/compose/compose.yaml up -d postgres`; a host port needs the guide's `compose.override.yaml`. `pnpm test:db` doesn't need it (testcontainers).

- `pnpm licenses:check`: the dependency-license gate, also run by `check`. Policy in `tools/licenses/policy.ts`, mirroring [Licensing](docs/architecture/12-licensing.md). `pnpm licenses:notices <file>` writes `THIRD_PARTY_NOTICES`; the Docker build generates it, and it's never committed.

Planned: size-limit in `check` (CI runs it separately today).

## Licence

FSL-1.1-ALv2 (`LICENSE.md`, `NOTICE`), with Frederik Schlentc as licensor. The repo is public; it started as a fresh repo with one squashed commit ([Licensing](docs/architecture/12-licensing.md)). External PRs aren't merged until the CLA bot is set up ([CONTRIBUTING](CONTRIBUTING.md)). Write everything as if it were public: never commit secrets, personal hostnames or IPs.
