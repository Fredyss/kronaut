import type { ProviderError, RevokeInput } from '@kronaut/core';
import { ProviderFailure } from '@kronaut/core';
import type { Actor } from '@kronaut/db';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { RevokeJob } from '../jobs/jobs.ts';
import { type PublishFixture, startPublishFixture } from '../publish/testing.ts';
import { runRevoke } from './revoke.ts';

const SYSTEM: Actor = { kind: 'system' };

let test: TestDatabase;
let fixture: PublishFixture;
const revoked: RevokeInput<unknown>[] = [];
let failure: ProviderError | null = null;

beforeAll(async () => {
  test = await startTestDatabase();
  fixture = await startPublishFixture(test, 'ws-credential-revoke');
  fixture.fake.runtime.revoke = async (_ctx, input) => {
    if (failure !== null) throw new ProviderFailure(failure);
    revoked.push(input);
  };
});

afterEach(() => {
  revoked.length = 0;
  failure = null;
});

afterAll(async () => {
  await fixture?.stop();
  await test?.stop();
});

async function disconnected(status = 'disconnected'): Promise<RevokeJob> {
  const accountId = await fixture.connectAccount(fixture.appId);
  return await fixture.owner.withActor(SYSTEM, async (trx) => {
    await trx.updateTable('social_accounts').set({ status }).where('id', '=', accountId).execute();
    const credential = await trx
      .selectFrom('account_credentials')
      .select(['id', 'version'])
      .where('social_account_id', '=', accountId)
      .executeTakeFirstOrThrow();
    return { workspaceId: fixture.workspaceId, id: credential.id, version: credential.version };
  });
}

describe('credential revoke job', () => {
  it('revokes the stored token of a disconnected channel with its app', async () => {
    const job = await disconnected();
    expect(await runRevoke(fixture.deps, job)).toBe('revoked');
    expect(revoked).toHaveLength(1);
    expect(revoked[0]?.app.clientId).toBeTruthy();
    expect(revoked[0]?.credentials).toBeTruthy();
  });

  it('skips a channel that was connected again or whose token changed', async () => {
    const reconnected = await disconnected('active');
    expect(await runRevoke(fixture.deps, reconnected)).toBe('skipped');
    const replaced = await disconnected();
    expect(await runRevoke(fixture.deps, { ...replaced, version: replaced.version + 1 })).toBe(
      'skipped',
    );
    expect(revoked).toEqual([]);
  });

  it('retries an outage and gives up on a refusal', async () => {
    const job = await disconnected();
    failure = { kind: 'transient', detail: 'http_503' };
    await expect(runRevoke(fixture.deps, job)).rejects.toThrow('transient');
    failure = { kind: 'permanent', code: 'unauthorized_client' };
    expect(await runRevoke(fixture.deps, job)).toBe('refused');
  });
});
