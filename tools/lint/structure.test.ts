import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  baseLeaks,
  credentialLeaks,
  featureImports,
  findCycles,
  folderCycles,
  type ImportGraph,
  isTesting,
  misplacedTests,
  oversizedFolders,
  repoImportGraph,
  rootFiles,
  routeImports,
  testingLeaks,
  valueImports,
} from './structure.ts';

const ROOT = join(import.meta.dirname, '..', '..');

describe('repo structure', () => {
  const graph = repoImportGraph(ROOT);

  it('sees the whole workspace', () => {
    expect(graph.size).toBeGreaterThan(800);
    expect(graph.has('packages/core/src/index.ts')).toBe(true);
    expect(graph.get('apps/server/src/start.ts')).toContain('apps/server/src/api-routes.ts');
    expect(graph.get('apps/web/src/main.tsx')).toContain('apps/web/src/app.tsx');
    expect(graph.get('apps/server/src/posts/draft/items.ts')).toContain(
      'packages/compose/src/index.ts',
    );
  });

  it('has no value-import cycle between files', () => {
    expect(findCycles(graph)).toEqual([]);
  });

  it('keeps testing helpers out of production code', () => {
    expect(testingLeaks(graph)).toEqual([]);
  });

  it('keeps route files out of imports between features', () => {
    expect(routeImports(graph)).toEqual([]);
  });

  it('keeps tests beside their code and one name for testing helpers', () => {
    expect(misplacedTests(graph)).toEqual([]);
  });

  it('matches the declared imports between features', () => {
    const declared = readFileSync(join(import.meta.dirname, 'feature-imports.json'), 'utf8');
    expect(featureImports(graph)).toEqual((JSON.parse(declared) as string[]).sort());
  });

  it('has no import loop between server feature folders', () => {
    expect(folderCycles(graph, 'server')).toEqual([]);
  });

  it('keeps base folders free of feature imports', () => {
    expect(baseLeaks(graph)).toEqual([]);
  });

  it('keeps only entrypoints and wiring in the src roots', () => {
    expect(rootFiles(graph)).toEqual([]);
  });

  it('lets only the named folders read credentials', () => {
    expect(credentialLeaks(graph)).toEqual([]);
  });

  it('keeps every source directory at 25 files or fewer', () => {
    expect(oversizedFolders(graph.keys())).toEqual([]);
  });
});

describe('the structure rules', () => {
  it('lists production imports between features by target file', () => {
    const server = 'apps/server/src';
    const app = (target: string) => `${server}/${target}`;
    const imports: ImportGraph = new Map([
      [app('posts/a.ts'), [app('posts/b.ts'), app('tags/read.ts'), app('tags/read.ts')]],
      [app('posts/c.ts'), [app('tags/read.ts'), app('queue/slots.ts'), app('config.ts')]],
      [app('posts/d.ts'), [app('http/errors.ts'), 'packages/core/src/index.ts']],
      [app('posts/a.test.ts'), [app('queue/routes.ts')]],
      [app('posts/testing.ts'), [app('queue/routes.ts')]],
      [app('api-routes.ts'), [app('posts/routes.ts')]],
      [app('start.ts'), [app('posts/routes.ts')]],
      ['apps/web/src/routes/post.tsx', ['apps/web/src/compose/form.tsx']],
      ['apps/web/src/inbox/list.tsx', ['apps/web/src/compose/form.tsx']],
      ['apps/web/src/inbox/row.tsx', ['apps/web/src/routes/post.tsx']],
    ]);
    expect(featureImports(imports)).toEqual([
      'server/posts -> queue/slots.ts',
      'server/posts -> tags/read.ts',
      'web/inbox -> compose/form.tsx',
      'web/inbox -> routes/post.tsx',
    ]);
  });

  it('finds a loop between folders of one app, also through http and root files', () => {
    const app = (target: string) => `apps/server/src/${target}`;
    const web = (target: string) => `apps/web/src/${target}`;
    const imports: ImportGraph = new Map([
      [app('posts/a.ts'), [app('approvals/binding.ts'), app('http/errors.ts')]],
      [app('approvals/binding.ts'), [app('notifications/write.ts')]],
      [app('notifications/write.ts'), [app('posts/dto.ts')]],
      [app('tags/read.ts'), [app('media/import/fetch.ts')]],
      [app('media/import/fetch.ts'), [app('tags/list.ts')]],
      [app('series/a.ts'), [app('cron.ts')]],
      [app('cron.ts'), [app('series/b.ts')]],
      [app('channels/a.ts'), [app('http/caller/authenticate.ts')]],
      [app('http/caller/authenticate.ts'), [app('auth/session.ts')]],
      [app('auth/session.ts'), [app('channels/b.ts'), app('http/errors.ts')]],
      [app('api-routes.ts'), [app('posts/routes.ts'), app('auth/routes.ts')]],
      [app('queue/a.test.ts'), [app('posts/a.ts')]],
      [app('queue/testing.ts'), [app('posts/a.ts')]],
      [app('queue/a.ts'), [app('queue/slots.ts')]],
      [app('posts/b.ts'), [app('queue/a.ts'), web('compose/form.tsx')]],
      [web('compose/form.tsx'), [web('calendar/grid.tsx')]],
      [web('calendar/grid.tsx'), [web('compose/dialog.tsx'), app('posts/dto.ts')]],
    ]);
    expect(folderCycles(imports, 'server')).toEqual([
      ['approvals', 'notifications', 'posts'],
      ['media', 'tags'],
      ['cron.ts', 'series'],
      ['auth', 'channels', 'http'],
    ]);
    expect(folderCycles(imports, 'web')).toEqual([['calendar', 'compose']]);
  });

  it("flags a feature that imports another feature's route file", () => {
    const app = (target: string) => `apps/server/src/${target}`;
    const imports: ImportGraph = new Map([
      [app('analytics/a.ts'), [app('queue/routes.ts'), app('queue/slots.ts')]],
      [app('tags/b.ts'), [app('media/upload-routes.ts')]],
      [app('queue/c.ts'), [app('queue/routes.ts')]],
      [app('api-routes.ts'), [app('queue/routes.ts')]],
    ]);
    expect(routeImports(imports)).toEqual([
      'server/analytics -> queue/routes.ts',
      'server/tags -> media/upload-routes.ts',
    ]);
  });

  it('flags a base folder that imports a feature, and declares no import of a base folder', () => {
    const app = (target: string) => `apps/web/src/${target}`;
    const server = (target: string) => `apps/server/src/${target}`;
    const imports: ImportGraph = new Map([
      [app('ui/icon.tsx'), [app('compose/form.tsx'), app('locale/i18n.ts'), app('ui/badge.tsx')]],
      [app('locale/choice.ts'), [app('api/me.ts'), app('app.tsx'), '@kronaut/sdk']],
      [app('ui/icon.test.tsx'), [app('compose/form.tsx')]],
      [app('inbox/list.tsx'), [app('api/client.ts'), app('ui/icon.tsx'), app('posts/queries.ts')]],
      ['apps/server/src/posts/list.ts', [app('api/errors.ts'), server('config/config.ts')]],
      [server('crypto/crypto.ts'), [server('auth/session.ts'), server('config/config.ts')]],
      [server('config/config.ts'), [server('start.ts'), '@kronaut/egress/smtp']],
      [server('providers/providers.test.ts'), [server('posts/list.ts')]],
      [server('http/web.ts'), [server('config/config.ts'), server('auth/session.ts')]],
    ]);
    expect(baseLeaks(imports)).toEqual([
      'apps/server/src/config/config.ts -> apps/server/src/start.ts',
      'apps/server/src/crypto/crypto.ts -> apps/server/src/auth/session.ts',
      'apps/server/src/http/web.ts -> apps/server/src/auth/session.ts',
      'apps/web/src/locale/choice.ts -> apps/web/src/app.tsx',
      'apps/web/src/ui/icon.tsx -> apps/web/src/compose/form.tsx',
    ]);
    expect(featureImports(imports)).toEqual([
      'server/crypto -> auth/session.ts',
      'server/http -> auth/session.ts',
      'server/posts -> api/errors.ts',
      'web/inbox -> posts/queries.ts',
      'web/ui -> compose/form.tsx',
    ]);
  });

  it('flags credential imports outside the named folders', () => {
    const vault = 'packages/credentials/src/index.ts';
    const store = 'apps/server/src/credentials/credential-store.ts';
    const server = (path: string) => `apps/server/src/${path}`;
    const keyring = 'packages/credentials/src/keyring.ts';
    const imports: ImportGraph = new Map([
      [server('start.ts'), [vault, store]],
      [server('cli/context.ts'), [vault, store]],
      [server('publish/input.ts'), [store]],
      [server('credentials/credential-seal.ts'), [vault]],
      [server('posts/list.ts'), [store]],
      [server('channels/connect.ts'), [vault, store]],
      [server('main.ts'), [vault]],
      [server('media/probe.ts'), [keyring, '@kronaut/credentials/envelope']],
      [server('posts/list.db.test.ts'), [store, vault]],
      ['apps/server/e2e/seed.ts', [vault]],
      [keyring, [vault]],
    ]);
    expect(credentialLeaks(imports)).toEqual([
      'apps/server/src/channels/connect.ts -> packages/credentials/src/index.ts',
      'apps/server/src/main.ts -> packages/credentials/src/index.ts',
      'apps/server/src/media/probe.ts -> @kronaut/credentials/envelope',
      'apps/server/src/media/probe.ts -> packages/credentials/src/keyring.ts',
      'apps/server/src/posts/list.ts -> apps/server/src/credentials/credential-store.ts',
      'apps/server/src/start.ts -> apps/server/src/credentials/credential-store.ts',
    ]);
  });

  it('flags a shared module in a src root', () => {
    const files = [
      'apps/web/src/app.tsx',
      'apps/web/src/main.tsx',
      'apps/web/src/foo.ts',
      'apps/web/src/foo.test.ts',
      'apps/web/src/testing.tsx',
      'apps/web/src/compose/form.tsx',
      'apps/server/src/config.ts',
      'apps/server/src/main.ts',
      'apps/server/src/api-routes.ts',
      'apps/server/src/start.db.test.ts',
      'apps/server/src/posts/routes.ts',
      'packages/core/src/index.ts',
    ];
    const graph: ImportGraph = new Map(files.map((file) => [file, []]));
    expect(rootFiles(graph)).toEqual([
      'apps/server/src/config.ts',
      'apps/web/src/foo.ts',
      'apps/web/src/testing.tsx',
    ]);
  });

  it('flags a source directory with more than 25 counted files', () => {
    const many = (folder: string, count: number, ext = 'ts') =>
      Array.from({ length: count }, (_, i) => `${folder}/f${i}.${ext}`);
    const files = [
      ...many('apps/server/src/posts', 26),
      ...many('apps/web/src/compose', 24, 'tsx'),
      'apps/web/src/compose/index.ts',
      'apps/web/src/compose/form.test.tsx',
      'apps/web/src/compose/form.spec.ts',
      'apps/web/src/compose/env.d.ts',
      'apps/web/src/compose/paraglide/messages.ts',
      'apps/web/src/compose/media/drop.ts',
      ...many('apps/web/src/calendar', 25),
      'apps/web/src/calendar/index.ts',
      ...many('packages/core/src', 26),
      ...many('tools/lint', 30),
      ...many('apps/server/e2e', 30),
    ];
    expect(oversizedFolders(files)).toEqual([
      'apps/server/src/posts (26)',
      'apps/web/src/calendar (26)',
      'packages/core/src (26)',
    ]);
  });

  it('reads value imports, re-exports and lazy imports, and skips type-only ones', () => {
    const source = [
      "import { a } from './a.ts';",
      "import {\n  b,\n  type C,\n} from './b.ts';",
      "import './side-effect.ts';",
      "export { d } from './d.ts';",
      "import type { E } from './e.ts';",
      "export class F {}\nexport type { G } from './g.ts';",
      "import { /* it's */ h } from './h.ts';",
      "const lazy = () => import('./lazy.ts');",
      'const quoted = () => import(`./quoted.ts`);',
      'const built = (name: string) => import(`./${name}.ts`);',
    ].join('\n');
    expect(valueImports(source)).toEqual([
      './a.ts',
      './b.ts',
      './side-effect.ts',
      './d.ts',
      './h.ts',
      './lazy.ts',
      './quoted.ts',
    ]);
  });

  it('finds a cycle and leaves a diamond alone', () => {
    const cyclic: ImportGraph = new Map([
      ['a.ts', ['b.ts']],
      ['b.ts', ['c.ts', 'node:path']],
      ['c.ts', ['a.ts']],
      ['d.ts', ['a.ts']],
    ]);
    expect(findCycles(cyclic)).toEqual([['a.ts', 'b.ts', 'c.ts']]);
    const diamond: ImportGraph = new Map([
      ['a.ts', ['b.ts', 'c.ts']],
      ['b.ts', ['d.ts']],
      ['c.ts', ['d.ts']],
      ['d.ts', []],
    ]);
    expect(findCycles(diamond)).toEqual([]);
  });

  it.each([
    'apps/server/src/posts/testing.ts',
    'apps/server/src/media/db-testing.ts',
    'apps/server/src/publish/testing-fake.ts',
    'apps/server/src/testing/fake.ts',
    'apps/web/src/compose-testing.tsx',
    'apps/web/src/compose/grid.testing.ts',
    'apps/web/src/compose/grid_testing.ts',
    'apps/web/src/calendar.test.tsx',
    '@kronaut/db/testing',
  ])('treats %s as testing code', (path) => {
    expect(isTesting(path)).toBe(true);
  });

  it('flags root tests with no subject and helpers named any other way', () => {
    const files = [
      'apps/web/src/theme.tsx',
      'apps/web/src/theme.test.tsx',
      'apps/server/src/config.ts',
      'apps/server/src/config.db.test.ts',
      'apps/web/src/compose.test.tsx',
      'apps/web/src/compose/form.test.tsx',
      'apps/server/src/posts/testing.ts',
      'apps/server/src/publish/testing/fake.ts',
      'apps/web/src/compose/testing.tsx',
      'apps/server/src/media/db-testing.ts',
      'apps/server/src/publish/testing-fake.ts',
    ];
    const graph: ImportGraph = new Map(files.map((file) => [file, []]));
    expect(misplacedTests(graph)).toEqual([
      'apps/web/src/compose.test.tsx',
      'apps/server/src/media/db-testing.ts',
      'apps/server/src/publish/testing-fake.ts',
    ]);
  });

  it('flags a production file that imports testing code', () => {
    const leaking: ImportGraph = new Map([
      ['apps/server/src/a.ts', ['apps/server/src/testing.ts', 'apps/server/src/b.ts']],
      ['apps/server/src/c.ts', ['@kronaut/db/testing']],
      ['apps/server/src/a.test.ts', ['apps/server/src/testing.ts']],
      ['apps/server/e2e/seed.ts', ['@kronaut/db/testing']],
    ]);
    expect(testingLeaks(leaking)).toEqual([
      'apps/server/src/a.ts -> apps/server/src/testing.ts',
      'apps/server/src/c.ts -> @kronaut/db/testing',
    ]);
  });
});
