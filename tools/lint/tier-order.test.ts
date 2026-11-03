import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { type ImportGraph, repoImportGraph } from './structure.ts';
import { looseFiles, tierBreaks, untieredFolders } from './tier-order.ts';

const ROOT = join(import.meta.dirname, '..', '..');

describe('tier order', () => {
  const graph = repoImportGraph(ROOT);

  it('keeps tier folders and base to feature folders, with no loose files', () => {
    const files = execFileSync(
      'git',
      ['ls-files', '--cached', '--others', '--exclude-standard', 'apps'],
      {
        cwd: ROOT,
        encoding: 'utf8',
      },
    );
    expect(looseFiles(files.split('\n'))).toEqual([]);
  });

  it('keeps every feature import pointing at a lower tier', () => {
    expect(tierBreaks(graph)).toEqual([]);
  });

  it('keeps every feature folder inside a tier folder or base', () => {
    expect(untieredFolders(graph)).toEqual([]);
  });

  it('flags imports into the same or a higher tier, a route file, a src root file or from the catalogs', () => {
    const web = (path: string) => `apps/web/src/${path}`;
    const server = (path: string) => `apps/server/src/${path}`;
    const imports: ImportGraph = new Map([
      [
        web('composer/compose/form.tsx'),
        [web('views/calendar/grid.tsx'), web('records/posts/queries.ts')],
      ],
      [
        web('views/calendar/grid.tsx'),
        [web('composer/compose/form.tsx'), web('views/approvals/list.tsx')],
      ],
      [
        web('lists/inbox/list.tsx'),
        [web('i18n/inbox.ts'), web('base/locale/format.ts'), '@kronaut/ui'],
      ],
      [
        web('lists/inbox/row.tsx'),
        [web('routes/post.tsx'), web('app.tsx'), web('lists/inbox/list.tsx')],
      ],
      [web('routes/post.tsx'), [web('pages/post-page/post-page.tsx')]],
      [web('base/locale/format.ts'), [web('composer/compose/form.tsx')]],
      [web('composer/compose/form.test.tsx'), [web('views/calendar/grid.tsx')]],
      [web('composer/compose/testing.tsx'), [web('views/calendar/grid.tsx')]],
      [web('drafts/list.tsx'), [web('composer/compose/form.tsx')]],
      [web('records/loose.ts'), []],
      [web('base/dates/format.ts'), []],
      [web('i18n/compose.ts'), [web('base/locale/i18n.ts'), web('composer/compose/when/time.tsx')]],
      [
        server('flow/posts/schedule.ts'),
        [server('actors/series/start.ts'), server('steps/queue/slots.ts')],
      ],
      [server('flow/posts/list.ts'), [server('base/http/errors.ts'), server('cron.ts')]],
      [server('testing/fake.ts'), [server('flow/posts/list.ts')]],
      [server('api-routes.ts'), [server('flow/posts/routes.ts')]],
    ]);
    expect(tierBreaks(imports)).toEqual([
      'apps/server/src/flow/posts/list.ts -> apps/server/src/cron.ts',
      'apps/server/src/flow/posts/schedule.ts -> apps/server/src/actors/series/start.ts',
      'apps/web/src/composer/compose/form.tsx -> apps/web/src/views/calendar/grid.tsx',
      'apps/web/src/i18n/compose.ts -> apps/web/src/composer/compose/when/time.tsx',
      'apps/web/src/lists/inbox/row.tsx -> apps/web/src/app.tsx',
      'apps/web/src/lists/inbox/row.tsx -> apps/web/src/routes/post.tsx',
      'apps/web/src/views/calendar/grid.tsx -> apps/web/src/views/approvals/list.tsx',
    ]);
    expect(untieredFolders(imports)).toEqual(['web/base/dates', 'web/drafts', 'web/records']);
  });

  it('flags any file directly in a tier folder or base', () => {
    const files = [
      'apps/web/src/pages/testing.ts',
      'apps/web/src/pages/foo.test.ts',
      'apps/web/src/base/tokens.css',
      'apps/server/src/flow/notes.json',
      'apps/web/src/pages/shell/app-shell.tsx',
      'apps/web/src/routes/post.tsx',
      'apps/web/src/styles.css',
      'apps/server/src/testing/job-worker.ts',
      'apps/server/src/drafts/list.ts',
    ];
    expect(looseFiles(files)).toEqual([
      'apps/server/src/flow/notes.json',
      'apps/web/src/base/tokens.css',
      'apps/web/src/pages/foo.test.ts',
      'apps/web/src/pages/testing.ts',
    ]);
  });
});
