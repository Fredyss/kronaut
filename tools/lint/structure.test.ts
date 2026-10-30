import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  featureImports,
  findCycles,
  type ImportGraph,
  isTesting,
  misplacedTests,
  repoImportGraph,
  testingLeaks,
  valueImports,
} from './structure.ts';

const ROOT = join(import.meta.dirname, '..', '..');

describe('repo structure', () => {
  const graph = repoImportGraph(ROOT);

  it('sees the whole workspace', () => {
    expect(graph.size).toBeGreaterThan(800);
    expect(graph.has('packages/core/src/index.ts')).toBe(true);
    expect(graph.get('apps/server/src/start.ts')).toContain('apps/server/src/http/api-routes.ts');
    expect(graph.get('apps/web/src/main.tsx')).toContain('apps/web/src/app.tsx');
    expect(graph.get('apps/server/src/posts/items.ts')).toContain('packages/compose/src/index.ts');
  });

  it('has no value-import cycle between files', () => {
    expect(findCycles(graph)).toEqual([]);
  });

  it('keeps testing helpers out of production code', () => {
    expect(testingLeaks(graph)).toEqual([]);
  });

  it('keeps tests beside their code and one name for testing helpers', () => {
    expect(misplacedTests(graph)).toEqual([]);
  });

  it('matches the declared imports between features', () => {
    const declared = readFileSync(join(import.meta.dirname, 'feature-imports.json'), 'utf8');
    expect(featureImports(graph)).toEqual((JSON.parse(declared) as string[]).sort());
  });
});

describe('the structure rules', () => {
  it('lists production imports between features by target file', () => {
    const server = 'apps/server/src';
    const app = (target: string) => `${server}/${target}`;
    const imports: ImportGraph = new Map([
      [app('posts/a.ts'), [app('posts/b.ts'), app('tags/read.ts'), app('tags/read.ts')]],
      [app('posts/c.ts'), [app('tags/read.ts'), app('queue/slots.ts'), app('config.ts')]],
      [app('posts/d.ts'), [app('http/types.ts'), 'packages/core/src/index.ts']],
      [app('posts/a.test.ts'), [app('queue/routes.ts')]],
      [app('posts/testing.ts'), [app('queue/routes.ts')]],
      [app('http/api-routes.ts'), [app('posts/routes.ts')]],
      [app('start.ts'), [app('posts/routes.ts')]],
      ['apps/web/src/routes/post.tsx', ['apps/web/src/compose/form.tsx']],
      ['apps/web/src/inbox/list.tsx', ['apps/web/src/compose/form.tsx']],
      ['apps/web/src/inbox/row.tsx', ['apps/web/src/routes/post.tsx']],
    ]);
    expect(featureImports(imports)).toEqual([
      'server/posts -> http/types.ts',
      'server/posts -> queue/slots.ts',
      'server/posts -> tags/read.ts',
      'web/inbox -> compose/form.tsx',
      'web/inbox -> routes/post.tsx',
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
    ].join('\n');
    expect(valueImports(source)).toEqual([
      './a.ts',
      './b.ts',
      './side-effect.ts',
      './d.ts',
      './h.ts',
      './lazy.ts',
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
