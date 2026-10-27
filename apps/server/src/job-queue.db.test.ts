import { createDatabase, type Database } from '@kronaut/db';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import { runOnce } from 'graphile-worker';
import { sql } from 'kysely';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { installJobQueue, SILENT_JOB_LOGGER } from './job-queue.ts';

let test: TestDatabase;
let owner: Database;
let app: Database;

beforeAll(async () => {
  test = await startTestDatabase();
  owner = createDatabase({ connectionString: test.ownerUrl });
  app = createDatabase({ connectionString: test.appUrl });
  await installJobQueue(test.ownerUrl, owner);
});

afterAll(async () => {
  await app?.destroy();
  await owner?.destroy();
  await test?.stop();
});

describe('installJobQueue', () => {
  it('lets the app role enqueue in a transaction and run jobs', async () => {
    await app.withActor({ kind: 'system' }, async (trx) => {
      await sql`select graphile_worker.add_job('probe', ${JSON.stringify({ n: 1 })}::json, job_key := 'probe:1')`.execute(
        trx,
      );
    });
    const seen: unknown[] = [];
    await runOnce({
      connectionString: test.appUrl,
      logger: SILENT_JOB_LOGGER,
      taskList: {
        probe: async (payload) => {
          seen.push(payload);
        },
      },
    });
    expect(seen).toEqual([{ n: 1 }]);
  });

  it('is idempotent', async () => {
    await expect(installJobQueue(test.ownerUrl, owner)).resolves.toBeUndefined();
  });

  it('gives the app role no DDL on the queue schema', async () => {
    await expect(
      app.withActor({ kind: 'system' }, (trx) =>
        sql`create table graphile_worker.evil (id int)`.execute(trx),
      ),
    ).rejects.toThrow(/permission denied/);
  });
});
