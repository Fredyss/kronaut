import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  findCycles,
  type ImportGraph,
  isTesting,
  repoImportGraph,
  testingLeaks,
  valueImports,
} from './structure.ts';

const ROOT = join(import.meta.dirname, '..', '..');

describe('repo structure', () => {
  const graph = repoImportGraph(ROOT);

  it('sees the whole workspace', () => {
    expect(graph.has('apps/server/src/start.ts')).toBe(true);
    expect(graph.has('apps/web/src/app.tsx')).toBe(true);
    expect(graph.has('packages/core/src/index.ts')).toBe(true);
    expect(graph.get('apps/server/src/start.ts')).toContain('apps/server/src/http/api-routes.ts');
  });

  it('has no value-import cycle between files', () => {
    expect(findCycles(graph)).toEqual([]);
  });

  it('keeps testing helpers out of production code', () => {
    expect(testingLeaks(graph)).toEqual([]);
  });
});

describe('the structure rules', () => {
  it('reads value imports and re-exports, and skips type-only ones', () => {
    const source = [
      "import { a } from './a.ts';",
      "import {\n  b,\n  type C,\n} from './b.ts';",
      "import './side-effect.ts';",
      "export { d } from './d.ts';",
      "import type { E } from './e.ts';",
      "export type { F } from './f.ts';",
    ].join('\n');
    expect(valueImports(source)).toEqual(['./a.ts', './b.ts', './side-effect.ts', './d.ts']);
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
    'apps/web/src/compose-testing.tsx',
    'apps/web/src/calendar.test.tsx',
    '@kronaut/db/testing',
  ])('treats %s as testing code', (path) => {
    expect(isTesting(path)).toBe(true);
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
