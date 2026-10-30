import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { migrate } from './migrate.ts';
import { createDatabaseIn, query, recordThrough } from './testing/migrate.ts';

let container: StartedPostgreSqlContainer;

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:17-alpine').start();
});

afterAll(async () => {
  await container.stop();
});

function freshDatabase(name: string): Promise<string> {
  return createDatabaseIn(container, name);
}

describe('media migrations', () => {
  it('backfills ai_locked for grant uploads, grant marks and grant duplicates', async () => {
    const url = await freshDatabase('ai_locked');
    await recordThrough(url, 9);
    const w = '01900000-0000-7000-8000-000000000ab1';
    const id = (n: number) => `01900000-0000-7000-8000-000000000ac${n}`;
    const asset = (n: number, extra: string, values: string) =>
      `insert into media_assets (workspace_id, id, kind, state, storage_key, ai_generated${extra})
         values ('${w}', '${id(n)}', 'image', 'processing', repeat('${n}', 64), true${values});`;
    await query(
      url,
      `insert into organizations (id, name) values ('01900000-0000-7000-8000-000000000aa1', 'O');
       insert into workspaces (id, organization_id, name, slug, timezone)
         values ('${w}', '01900000-0000-7000-8000-000000000aa1', 'W', 'w', 'UTC');
       ${asset(1, ', uploaded_by_grant_id', `, '${id(9)}'`)} ${asset(2, '', '')} ${asset(3, '', '')}
       ${asset(4, '', '')}
       ${asset(5, ', uploaded_by_grant_id, duplicate_of_id', `, '${id(9)}', '${id(3)}'`)}
       insert into audit_events (workspace_id, actor_kind, actor_id, grant_kind, sponsor_user_id, surface, action,
                                 resource_kind, resource_id, outcome, correlation_id)
         values ('${w}', 'grant', '${id(9)}', 'api_key', '${id(7)}', 'api', 'media.ai_marked', 'media_asset',
                 '${id(2)}', 'ok', '${id(8)}');`,
    );
    await migrate({ connectionString: url });
    expect(
      await query(url, `select ai_locked from media_assets where id < '${id(5)}' order by id`),
    ).toEqual([true, true, true, false].map((ai_locked) => ({ ai_locked })));
    await expect(
      query(url, `update media_assets set ai_generated = false where id = '${id(1)}'`),
    ).rejects.toThrow(/ck_media_assets_ai_locked/);
  });
});
