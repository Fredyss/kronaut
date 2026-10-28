# Repo layout

pnpm workspace. Every package is TypeScript strict, ESM, built with `tsc -b` project references.

```
apps/
  server/                 src/main.ts --role=all|api|worker|media ; src/cli.ts
                          src/entitlements/: the only place MODE is compared with 'saas' (ADR-0019)
  web/                    Vite SPA
packages/
  core/                   domain types, state machine, errors
  compose/                text counters, serializers, validate()            browser-safe
  contract/               defineRoute registry → openapi.json
  sdk/                    generated client (web, public API, MCP)
  i18n/                   message catalogs (en/sk/cs: the app, and the CLI apart) and compiled Paraglide modules; browser-safe; shared by web and server
  db/                     Kysely types, migrations/, tenant-scoped repos, withTenant()
    schema/v1.sql         normative v1 schema; migrations are tested against it
  credentials/            token vault; only the worker and the connect flow may import it
  egress/                 the only module allowed to import undici or call fetch
  media/                  storage interface, signing, validation, re-encode
  providers/
    src/_kit/             OAuth2/PKCE, chunked upload, error mapping helpers
    src/<id>/             manifest.ts, runtime.ts, preview.tsx?, fixtures/, runtime.test.ts
                          exports: @kronaut/providers/manifests (browser-safe)
                                   @kronaut/providers/runtime  (server only)
  ui/                     shadcn components + 6 preview archetypes
infra/
  compose/                compose.yaml for self-host and local dev
tools/                    repo scripts (codegen, lint helpers, license gate)
  biome/                  GritQL lint plugins, wired in biome.json
  lint/                   Vitest lint tests (Biome rule self-test)
docs/
  architecture/           this spec, one chapter per concern
  adr/                    architecture decision records (normative)
  reference/              provider facts and test catalogues
.github/workflows/        CI
```

Dependency direction: `apps → packages`, never the reverse. Apps never import each other: the web app reaches the server only through `@kronaut/sdk`. `core` depends on nothing in the workspace. `compose` and `providers/manifests` stay browser-safe: no `node:` imports, no `credentials`, no `egress`. Biome restricted-import rules enforce the boundaries.

Enforced by: `biome.json` (restricted imports and globals, with the GritQL plugins in `tools/biome/`) and the Vitest tests in `tools/lint/`, which also prove each rule fires at a covered path and stays quiet at an exempt one.
