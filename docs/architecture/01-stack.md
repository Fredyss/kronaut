# Stack

| Layer | Choice | Runner-up | Why |
|---|---|---|---|
| Runtime | Node 24 LTS, TS strict | Go 1.25 | one language; shared Zod manifests across editor/API/worker/SDK/MCP |
| HTTP | Hono + in-house `defineRoute()` | Fastify + zod provider | `defineRoute` enforces auth mode + *runtime* response `parse()` (strip unknown) — `@hono/zod-openapi` alone does not validate responses |
| Contracts | Zod 4 → OpenAPI → generated TS client (hey-api) | — | public API, SPA, SDK, extension share one contract; no tRPC second surface |
| DB | Postgres 17 only | — | SQLite lacks SKIP LOCKED / NOTIFY / advisory locks; two dialects doubles tests |
| Query | Kysely + plain SQL migrations + kysely-codegen | Drizzle core | explicit selects by construction; SQL-shaped for locks/CTEs; real migrations, never schema push on boot |
| Jobs | graphile-worker | pg-boss v12 | `add_job()` in the same txn as the post (no outbox); `job_key` replace for reschedule; per-queue serial; built-in cron |
| Auth | Hand-rolled opaque DB sessions (Copenhagen-book style), `@node-rs/argon2`, `@oslojs/otp`, `arctic` (OAuth+PKCE), `jose` (CF Access JWT) | better-auth (only for SaaS orgs/invites) | ~400 LOC for owner mode; better-auth has had several 2025–26 advisories in the plugins you'd use |
| Crypto | `node:crypto` AES-256-GCM, per-row DEK wrapped by versioned `KRONAUT_KEK_<v>`, AAD = `aad_v\|credential_id\|workspace_id\|provider` (ADR-0021) | single key | zero deps; ciphertext can't be swapped between rows; KEK rotation re-wraps DEKs only |
| Egress | `packages/egress`: undici Agent, every A/AAAA validated + pinned, manual redirect re-check, size/time caps, `setGlobalDispatcher` at boot | separate fetcher container (SaaS) | one choke point for all outbound HTTP; no global off-switch |
| Media | sharp in a worker_thread + ffprobe/ffmpeg subprocess; local FS + HMAC-signed URLs served by `--role=media` on its own hostname | R2 + Cloudflare Worker (same HMAC scheme) | portable single compose; no path-based CF Access bypass |
| Frontend | React 19 + Vite SPA, TanStack Router + Query, Zustand (editor store only) | — | everything is behind login; SSR buys nothing and adds attack surface |
| UI | shadcn/ui + Tailwind v4 | React Aria Components | copy-in code, best agent fluency |
| Calendar | custom CSS grid + dnd-kit (keyboard sensor), week/month/list | FullCalendar v6 | core surface; plays well with optimistic TanStack Query; bundle budget |
| Dates | `temporal-polyfill` (server + client) | date-fns v4 + @date-fns/tz | models wall-time + IANA zone correctly |
| Editor | Tiptap 3; canonical = ProseMirror JSON; `@kronaut/compose` | — | never store HTML; per-network serializers |
| Image edit | react-easy-crop (client) + sharp transforms (server) | — | no commercial canvas-editor SDK (400–600 KB) |
| i18n | Paraglide JS 2 | i18next | compiled, tree-shaken, type-safe keys; `en`, `sk`, `cs` from Phase 1 (see [Frontend → i18n](08-frontend.md#i18n-english-slovak-czech)) |
| AI | Vercel AI SDK, single layer | raw fetch | one AI layer for every provider |
| MCP | `@modelcontextprotocol/sdk`, tools generated from the route registry | — | same auth/scopes as REST; draft-only |
| Tooling | pnpm workspaces + catalogs, Biome 2 + GritQL plugins, Knip, Vitest, MSW fixtures, Playwright, testcontainers | ESLint | Biome covers restricted imports/globals, no-danger; GritQL for `Math.random` and `selectAll` bans |
| Logs/ops | pino with redaction list, `/healthz` + `/readyz`, jobs admin page | OTel (SaaS) | |
| Deploy | one distroless nonroot image, roles `all \| api \| worker \| media`; compose pinned by digest | — | |

