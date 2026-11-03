import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { type ImportGraph, repoImportGraph } from './structure.ts';
import { tierBreaks, untieredFolders } from './tier-order.ts';

describe('tier order', () => {
  const graph = repoImportGraph(join(import.meta.dirname, '..', '..'));

  it('keeps every feature import pointing at a lower tier', () => {
    expect(tierBreaks(graph)).toEqual([]);
  });

  it('gives every feature folder a tier', () => {
    expect(untieredFolders(graph)).toEqual([]);
  });

  it('flags imports into the same or a higher tier, a route file or a src root file', () => {
    const web = (path: string) => `apps/web/src/${path}`;
    const server = (path: string) => `apps/server/src/${path}`;
    const imports: ImportGraph = new Map([
      [web('compose/form.tsx'), [web('calendar/grid.tsx'), web('posts/queries.ts')]],
      [web('calendar/grid.tsx'), [web('compose/form.tsx'), web('approvals/list.tsx')]],
      [web('inbox/list.tsx'), [web('i18n/inbox.ts'), web('locale/format.ts'), '@kronaut/ui']],
      [web('inbox/row.tsx'), [web('routes/post.tsx'), web('app.tsx'), web('inbox/list.tsx')]],
      [web('routes/post.tsx'), [web('post-page/post-page.tsx')]],
      [web('locale/format.ts'), [web('compose/form.tsx')]],
      [web('compose/form.test.tsx'), [web('calendar/grid.tsx')]],
      [web('compose/testing.tsx'), [web('calendar/grid.tsx')]],
      [web('drafts/list.tsx'), [web('compose/form.tsx')]],
      [server('posts/schedule.ts'), [server('series/start.ts'), server('queue/slots.ts')]],
      [server('posts/list.ts'), [server('http/errors.ts'), server('cron.ts')]],
      [server('testing/fake.ts'), [server('posts/list.ts')]],
      [server('api-routes.ts'), [server('posts/routes.ts')]],
    ]);
    expect(tierBreaks(imports)).toEqual([
      'apps/server/src/posts/list.ts -> apps/server/src/cron.ts',
      'apps/server/src/posts/schedule.ts -> apps/server/src/series/start.ts',
      'apps/web/src/calendar/grid.tsx -> apps/web/src/approvals/list.tsx',
      'apps/web/src/compose/form.tsx -> apps/web/src/calendar/grid.tsx',
      'apps/web/src/inbox/row.tsx -> apps/web/src/app.tsx',
      'apps/web/src/inbox/row.tsx -> apps/web/src/routes/post.tsx',
    ]);
    expect(untieredFolders(imports)).toEqual(['web/drafts']);
  });
});
