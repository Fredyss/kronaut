import { spawnSync } from 'node:child_process';
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const ROOT = join(import.meta.dirname, '..', '..');
const BIOME = join(ROOT, 'node_modules', '.bin', 'biome');
const PLUGIN_DIR = join(ROOT, 'tools', 'biome');
const SANDBOX = mkdtempSync(join(tmpdir(), 'kronaut-biome-'));

const PLUGIN_BY_MESSAGE = new Map(
  readdirSync(PLUGIN_DIR)
    .filter((file) => file.endsWith('.grit'))
    .map((file) => {
      const message = /message\s*=\s*"([^"]+)"/.exec(readFileSync(join(PLUGIN_DIR, file), 'utf8'));
      return [message?.[1] ?? file, `plugin/${file.slice(0, -'.grit'.length)}`] as const;
    }),
);

interface Diagnostic {
  category: string;
  message: string;
}

interface LintResult {
  status: number | null;
  rules: string[];
}

function lint(path: string, code: string): LintResult {
  const dir = mkdtempSync(join(SANDBOX, 'case-'));
  cpSync(join(ROOT, 'biome.json'), join(dir, 'biome.json'));
  cpSync(PLUGIN_DIR, join(dir, 'tools', 'biome'), { recursive: true });
  mkdirSync(dirname(join(dir, path)), { recursive: true });
  writeFileSync(join(dir, path), code);
  const result = spawnSync(
    BIOME,
    ['lint', '--vcs-enabled=false', '--reporter=json', '--max-diagnostics=none', path],
    { cwd: dir, encoding: 'utf8' },
  );
  const report = result.stdout.split('\n').find((line) => line.startsWith('{'));
  if (report === undefined) throw new Error(`biome produced no report: ${result.stderr}`);
  const diagnostics = (JSON.parse(report) as { diagnostics: Diagnostic[] }).diagnostics;
  return {
    status: result.status,
    rules: diagnostics.map((d) =>
      d.category === 'plugin' ? (PLUGIN_BY_MESSAGE.get(d.message) ?? d.message) : d.category,
    ),
  };
}

afterAll(() => {
  rmSync(SANDBOX, { recursive: true, force: true });
});

const RESTRICTED = 'lint/style/noRestrictedImports';
const BASE = [
  'undici',
  'undici/types/dispatcher',
  'nodemailer',
  'nodemailer/lib/smtp-pool',
  '@kronaut/server',
  '@kronaut/web/routes',
];
const NO_DB = ['@kronaut/db', '@kronaut/db/sweeps', 'kysely', 'pg'];
const LAYERS = (
  [
    ['packages/core/src/x.ts', BASE],
    ['packages/providers/src/x/runtime.ts', [...BASE, ...NO_DB]],
    ['packages/providers/src/manifests.ts', [...BASE, ...NO_DB]],
    ['packages/providers/src/x/manifest.ts', [...BASE, ...NO_DB]],
    ['packages/compose/src/x.ts', [...BASE, ...NO_DB]],
  ] as const
).flatMap(([path, sources]) => sources.map((source) => [source, path] as const));

describe('biome rules', () => {
  it('maps every plugin to a distinct message', () => {
    expect(PLUGIN_BY_MESSAGE.size).toBe(9);
    expect([...PLUGIN_BY_MESSAGE.values()].every((rule) => rule.startsWith('plugin/no'))).toBe(
      true,
    );
  });

  it.each([
    ['plugin/noMathRandom', 'apps/server/src/token.ts', 'export const r = Math.random();\n'],
    ['plugin/noMathRandom', 'packages/core/src/token.ts', 'export const r = Math.random;\n'],
    ['plugin/noWallClock', 'apps/server/src/clock.ts', 'export const n = Date.now();\n'],
    ['plugin/noWallClock', 'packages/media/src/clock.ts', 'export const n = new Date();\n'],
    [
      'plugin/noInstantDate',
      'apps/server/src/clock.ts',
      'declare const at: { epochMilliseconds: number };\nexport const d = new Date(at.epochMilliseconds);\n',
    ],
    [
      'plugin/noMathRandom',
      'packages/media/src/token.ts',
      'export const r = globalThis.Math.random();\n',
    ],
    [
      'plugin/noSelectAll',
      'packages/db/src/repo.ts',
      'declare const q: { selectAll(): unknown };\nexport const rows = q.selectAll();\n',
    ],
    [
      'plugin/noSelectAll',
      'apps/server/src/repo.ts',
      "declare const q: { selectAll(t: string): unknown };\nexport const rows = q.selectAll('b');\n",
    ],
    [
      'plugin/noModeSaas',
      'apps/server/src/signup.ts',
      "declare const env: { MODE: string };\nexport const on = env.MODE === 'saas';\n",
    ],
    [
      'plugin/noModeSaas',
      'packages/core/src/mode.ts',
      "declare const MODE: string;\nexport const off = 'saas' !== MODE;\n",
    ],
    [
      'plugin/noModeSaas',
      'apps/web/src/mode.ts',
      'declare const env: Record<string, string>;\nexport const on = env[\'MODE\'] === "saas";\n',
    ],
    [
      'plugin/noModeSaas',
      'apps/server/src/mode.ts',
      "declare const process: { env: { MODE: string } };\nexport const on = 'saas' == process.env.MODE;\n",
    ],
    [
      'plugin/noModeSaas',
      'packages/db/src/mode.ts',
      "declare const MODE: string;\nexport const off = MODE != 'saas';\n",
    ],
    ['plugin/noGlobalFetch', 'packages/core/src/net.ts', 'export const f = globalThis.fetch;\n'],
    ['plugin/noGlobalFetch', 'apps/web/src/net.ts', 'export const f = window?.fetch;\n'],
    ['plugin/noGlobalFetch', 'apps/server/src/net.ts', "export const f = self['fetch'];\n"],
    ['plugin/noGlobalFetch', 'apps/server/src/net.ts', 'export const f = self["fetch"];\n'],
    ['plugin/noGlobalFetch', 'apps/server/src/net.ts', "export const f = globalThis?.['fetch'];\n"],
    ['plugin/noGlobalFetch', 'apps/web/src/net.ts', 'export const f = window?.["fetch"];\n'],
    ['plugin/noGlobalFetch', 'apps/web/src/api.tsx', 'export const f = globalThis.fetch;\n'],
    [
      'lint/style/noRestrictedGlobals',
      'apps/web/src/api.ts',
      "export const r = fetch('/v1/me');\n",
    ],
    [
      'lint/style/noRestrictedGlobals',
      'apps/server/src/net.ts',
      "export const r = fetch('https://example.test');\n",
    ],
    [
      'plugin/noRawDb',
      'apps/server/src/db.ts',
      "import { Kysely } from 'kysely';\nexport const s = Kysely;\n",
    ],
    [
      'plugin/noRawDb',
      'apps/server/src/db.ts',
      "import { sql, Kysely } from 'kysely';\nexport const s = [sql, Kysely];\n",
    ],
    [
      'plugin/noRawDb',
      'apps/server/src/db.ts',
      "import { PostgresDialect } from 'kysely';\nexport const s = PostgresDialect;\n",
    ],
    [
      'plugin/noRawDb',
      'apps/server/src/db.ts',
      "import kysely from 'kysely';\nexport const s = kysely;\n",
    ],
    [
      'plugin/noRawDb',
      'apps/server/src/db.ts',
      "import { sql } from 'kysely/helpers/postgres';\nexport const s = sql;\n",
    ],
    [
      'plugin/noRawDb',
      'apps/server/src/db.ts',
      "import { Pool } from 'pg';\nexport const s = Pool;\n",
    ],
    ['plugin/noRawDb', 'packages/media/src/db.ts', "import pg from 'pg';\nexport const p = pg;\n"],
    [
      'plugin/noRawDb',
      'packages/core/src/db.ts',
      "export { sql } from 'kysely/helpers/postgres';\n",
    ],
    ['plugin/noRawDb', 'apps/server/src/lazy.ts', "export const k = import('kysely');\n"],
    ['plugin/noRawDb', 'apps/server/src/all.ts', "export * from 'pg';\n"],
    [
      'plugin/noRawDb',
      'apps/server/src/ns.ts',
      "import * as k from 'kysely';\nexport const n = k;\n",
    ],
    [
      'plugin/noRawDb',
      'apps/server/src/cjs.ts',
      "declare const require: (id: string) => unknown;\nexport const p = require('pg/lib/client');\n",
    ],
    [
      'plugin/noDbTesting',
      'apps/server/src/seed.ts',
      "import { startTestDatabase } from '@kronaut/db/testing';\nexport const s = startTestDatabase;\n",
    ],
    [
      'plugin/noRelativeJsImport',
      'packages/core/src/a.ts',
      "import { b } from './b.js';\nexport const a = b;\n",
    ],
    ['plugin/noRelativeJsImport', 'packages/db/src/a.ts', "export { b } from '../b.js';\n"],
    ['plugin/noRelativeJsImport', 'apps/web/src/a.ts', "export * as b from './b/index.js';\n"],
    [
      RESTRICTED,
      'apps/server/src/http.ts',
      "import { Agent } from 'undici';\nexport const a = Agent;\n",
    ],
    [
      RESTRICTED,
      'packages/media/src/http.ts',
      "import type { Dispatcher } from 'undici/types/dispatcher';\nexport type D = Dispatcher;\n",
    ],
    [
      RESTRICTED,
      'apps/server/src/mail.ts',
      "import nodemailer from 'nodemailer';\nexport const n = nodemailer;\n",
    ],
    [
      RESTRICTED,
      'apps/web/src/mail.ts',
      "import nodemailer from 'nodemailer';\nexport const n = nodemailer;\n",
    ],
    [
      'lint/complexity/useMaxParams',
      'apps/server/src/fresh.ts',
      'export function f(a: number, b: number, c: number, d: number, e: number): number {\n  return a + b + c + d + e;\n}\n',
    ],
    [
      RESTRICTED,
      'packages/media/src/app.ts',
      "import { main } from '@kronaut/server';\nexport const m = main;\n",
    ],
    [
      RESTRICTED,
      'apps/web/src/server.ts',
      "import { main } from '@kronaut/server';\nexport const m = main;\n",
    ],
    [
      RESTRICTED,
      'packages/core/src/dep.ts',
      "import { x } from '@kronaut/compose';\nexport const y = x;\n",
    ],
    [
      RESTRICTED,
      'packages/core/src/dep.ts',
      "import { x } from '@kronaut/providers/manifests';\nexport const y = x;\n",
    ],
    [
      RESTRICTED,
      'packages/providers/src/bluesky/runtime.ts',
      "import { withTenant } from '@kronaut/db';\nexport const w = withTenant;\n",
    ],
    [
      RESTRICTED,
      'packages/providers/src/bluesky/runtime.ts',
      "import type { Kysely } from 'kysely';\nexport type K = Kysely<object>;\n",
    ],
    [
      RESTRICTED,
      'packages/providers/src/bluesky/manifest.ts',
      "import { createHash } from 'node:crypto';\nexport const h = createHash;\n",
    ],
    [
      RESTRICTED,
      'packages/compose/src/count.ts',
      "import { join } from 'node:path';\nexport const j = join;\n",
    ],
    [
      RESTRICTED,
      'packages/compose/src/count.ts',
      "import { createEgressClient } from '@kronaut/egress';\nexport const c = createEgressClient;\n",
    ],
    [
      RESTRICTED,
      'packages/providers/src/manifests.ts',
      "import { open } from '@kronaut/credentials/vault';\nexport const o = open;\n",
    ],
    [
      RESTRICTED,
      'packages/providers/src/manifests.ts',
      "import { publish } from '@kronaut/providers/runtime';\nexport const p = publish;\n",
    ],
    [
      'plugin/noModeSaas',
      'apps/server/src/mode.ts',
      "declare const env: { MODE: string } | undefined;\nexport const a = env?.MODE === 'saas';\n",
    ],
    [
      'plugin/noModeSaas',
      'apps/server/src/mode.ts',
      "declare const process: { env?: { MODE: string } };\nexport const a = process.env?.MODE === 'saas';\n",
    ],
    [
      'plugin/noModeSaas',
      'apps/server/src/mode.ts',
      'declare const $_: Record<string, string> | undefined;\nexport const a = $_?.["MODE"] === \'saas\';\n',
    ],
    [
      'plugin/noModeSaas',
      'apps/server/src/mode.ts',
      "declare const $_: Record<string, string> | undefined;\nexport const a = $_?.['MODE'] === 'saas';\n",
    ],
    [
      'plugin/noModeSaas',
      'apps/server/src/mode.ts',
      'declare const MODE: string;\nexport const a = MODE === `saas`;\n',
    ],
    [
      'plugin/noModeSaas',
      'apps/server/src/mode.ts',
      'declare const MODE: string;\nexport const a = `saas` !== MODE;\n',
    ],
    [
      'plugin/noModeSaas',
      'apps/server/src/mode.ts',
      'declare const env: { MODE: string } | undefined;\nexport const a = `saas` == env?.MODE;\n',
    ],
    [
      'plugin/noModeSaas',
      'apps/server/src/mode.ts',
      'declare const env: { MODE: string };\nexport const a = env.MODE != `saas`;\n',
    ],
    [
      'plugin/noModeSaas',
      'apps/server/src/mode.ts',
      "declare const env: { MODE: string } | undefined;\nexport const a = 'saas' != env?.MODE;\n",
    ],
    ['plugin/noMathRandom', 'apps/server/src/token.ts', 'export const r = Math?.random();\n'],
    [
      'plugin/noMathRandom',
      'apps/server/src/token.ts',
      'export const r = globalThis?.Math.random();\n',
    ],
    [
      'plugin/noMathRandom',
      'apps/server/src/token.ts',
      'export const r = globalThis.Math?.random();\n',
    ],
    [
      'plugin/noMathRandom',
      'apps/server/src/token.ts',
      'export const r = globalThis?.Math?.random();\n',
    ],
    ['plugin/noMathRandom', 'apps/server/src/token.ts', "export const r = Math['random']();\n"],
    ['plugin/noMathRandom', 'apps/server/src/token.ts', 'export const r = Math?.["random"]();\n'],
    [
      'plugin/noMathRandom',
      'apps/server/src/token.ts',
      "export const r = globalThis['Math']['random']();\n",
    ],
    [
      'plugin/noMathRandom',
      'apps/server/src/token.ts',
      "export const r = globalThis?.['Math']?.random();\n",
    ],
    [
      RESTRICTED,
      'packages/egress/src/app.ts',
      "import { main } from '@kronaut/server';\nexport const m = main;\n",
    ],
    [
      RESTRICTED,
      'packages/compose/src/fs.ts',
      "import { readFile } from 'node:fs/promises';\nexport const r = readFile;\n",
    ],
    [
      RESTRICTED,
      'packages/compose/src/fs.ts',
      "import { join } from 'node:path/posix';\nexport const j = join;\n",
    ],
    [
      RESTRICTED,
      'packages/providers/src/x/manifest.ts',
      "import { Readable } from 'node:stream/web';\nexport const r = Readable;\n",
    ],
    [
      'lint/style/useNodejsImportProtocol',
      'apps/server/src/fs.ts',
      "import { readFile } from 'fs';\nexport const r = readFile;\n",
    ],
  ])('reports %s for %s', (rule, path, code) => {
    const result = lint(path, code);
    expect(result.rules).toContain(rule);
    expect(result.status).not.toBe(0);
  });

  it.each(LAYERS)('restricts %s in %s', (source, path) => {
    const result = lint(path, `import { v } from '${source}';\nexport const w = v;\n`);
    expect(result.rules).toContain(RESTRICTED);
    expect(result.status).not.toBe(0);
  });

  it.each([
    ['apps/web/src/token.ts', 'export const r = Math.random();\n'],
    ['packages/compose/src/token.ts', 'export const r = Math.random();\n'],
    ['apps/web/src/clock.ts', 'export const n = Date.now();\n'],
    ['apps/server/src/clock.test.ts', 'export const n = Date.now();\n'],
    ['apps/server/src/posts/testing.ts', 'export const n = new Date();\n'],
    ['packages/ui/src/clock.ts', 'export const n = Date.now();\n'],
    [
      'packages/core/src/time.ts',
      'declare const at: { epochMilliseconds: number };\nexport const d = new Date(at.epochMilliseconds);\n',
    ],
    ['packages/ui/src/token.ts', 'export const r = Math.random();\n'],
    [
      'packages/db/src/repo.test.ts',
      'declare const q: { selectAll(): unknown };\nexport const rows = q.selectAll();\n',
    ],
    [
      'apps/server/src/entitlements/mode.ts',
      "declare const env: { MODE: string };\nexport const on = env.MODE === 'saas';\n",
    ],
    [
      'apps/server/src/mode.ts',
      'declare const env: { MODE: string };\nexport const m = env.MODE;\n',
    ],
    ['packages/egress/src/net.ts', 'export const f = globalThis.fetch;\n'],
    ['packages/sdk/src/client.ts', 'export const f = globalThis.fetch;\n'],
    ['packages/sdk/src/client.ts', "export const r = fetch('/v1/me');\n"],
    ['packages/egress/src/http.ts', "import { Agent } from 'undici';\nexport const a = Agent;\n"],
    [
      'packages/egress/src/smtp.ts',
      "import nodemailer from 'nodemailer';\nexport const n = nodemailer;\n",
    ],
    [
      'packages/db/src/db.ts',
      "import { sql } from 'kysely';\nimport pg from 'pg';\nexport const s = [sql, pg];\n",
    ],
    ['apps/server/src/db.ts', "import { sql } from 'kysely';\nexport const s = sql;\n"],
    [
      'apps/server/src/db.ts',
      "import { sql, type RawBuilder } from 'kysely';\nexport const s: [typeof sql, RawBuilder<unknown> | undefined] = [sql, undefined];\n",
    ],
    [
      'apps/server/src/db.ts',
      "import { type Kysely, sql } from 'kysely';\nexport const s: [typeof sql, Kysely<object> | undefined] = [sql, undefined];\n",
    ],
    [
      'apps/server/src/db.ts',
      "import type { Kysely } from 'kysely';\nexport type K = Kysely<object>;\n",
    ],
    ['apps/server/src/db.ts', "export type { Kysely } from 'kysely';\n"],
    [
      'apps/server/src/seed.test.ts',
      "import { startTestDatabase } from '@kronaut/db/testing';\nexport const s = startTestDatabase;\n",
    ],
    [
      'packages/db/scripts/seed.ts',
      "import { startTestDatabase } from '@kronaut/db/testing';\nexport const s = startTestDatabase;\n",
    ],
    ['packages/core/src/a.ts', "import { b } from './b.ts';\nexport const a = b;\n"],
    [
      'apps/server/src/db.ts',
      "import { withTenant } from '@kronaut/db';\nexport const w = withTenant;\n",
    ],
    [
      'packages/providers/src/x/runtime.ts',
      "import { createHash } from 'node:crypto';\nimport { c } from '@kronaut/egress';\nexport const h = [createHash, c];\n",
    ],
    ['packages/providers/src/manifests.ts', "import { z } from 'zod';\nexport const s = z;\n"],
  ])('allows %s', (path, code) => {
    expect(lint(path, code)).toEqual({ status: 0, rules: [] });
  });
});
