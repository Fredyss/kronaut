import type { ProviderError, RevokeInput } from '@kronaut/core';
import { ProviderFailure } from '@kronaut/core';
import type { Actor } from '@kronaut/db';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import type { HttpClient } from '@kronaut/egress';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createProviderRegistry } from '../../base/providers/providers.ts';
import type { RevokeJob } from '../../infrastructure/jobs/jobs.ts';
import { flagAccount } from '../../steps/publish/incidents.ts';
import { type PublishFixture, startPublishFixture } from '../../steps/publish/testing.ts';
import { type RevokeDeps, runRevoke } from './revoke.ts';

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

function deps(providers = fixture.deps.providers): RevokeDeps {
  return { ...fixture.deps, providers, flagAccount };
}

async function disconnected(status = 'disconnected', accountId?: string): Promise<RevokeJob> {
  accountId ??= await fixture.connectAccount(fixture.appId);
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
    expect(await runRevoke(deps(), job)).toBe('revoked');
    expect(revoked).toHaveLength(1);
    expect(revoked[0]?.app.clientId).toBeTruthy();
    expect(revoked[0]?.credentials).toBeTruthy();
  });

  it('skips a channel that was connected again or whose token changed', async () => {
    const reconnected = await disconnected('active');
    expect(await runRevoke(deps(), reconnected)).toBe('skipped');
    const replaced = await disconnected();
    expect(await runRevoke(deps(), { ...replaced, version: replaced.version + 1 })).toBe('skipped');
    expect(revoked).toEqual([]);
  });

  it('retries an outage and gives up on a refusal', async () => {
    const job = await disconnected();
    failure = { kind: 'transient', detail: 'http_503' };
    await expect(runRevoke(deps(), job)).rejects.toThrow('transient');
    failure = { kind: 'permanent', code: 'unauthorized_client' };
    expect(await runRevoke(deps(), job)).toBe('refused');
  });

  it('flags the active channels of the revoked Google account or token, after a revoke only', async () => {
    const { fake } = fixture;
    const provider = 'shared';
    const app = await fixture.createApp('shared-client', provider);
    const otherApp = await fixture.createApp('shared-client-2', provider);
    const providers = createProviderRegistry(
      [{ ...fake.manifest, id: provider, dataRetention: { disconnectedDays: 7, lapsedDays: 30 } }],
      [
        {
          ...fake.runtime,
          id: provider,
          sharesGrant: (a, b) => JSON.stringify(a) === JSON.stringify(b),
        },
      ],
      () => ({}) as HttpClient,
    );
    const connect = async (token: string, subject: string | null = null, appId = app) => {
      const id = await fixture.connectAccount(appId, { provider, value: { token } });
      await fixture.owner.withActor(SYSTEM, (trx) =>
        trx
          .updateTable('social_accounts')
          .set({ provider_subject_id: subject })
          .where('id', '=', id)
          .execute(),
      );
      return id;
    };
    const [revokedId, sibling, sameSubject, otherSubject, other, refusedId, spared, otherProject] =
      [
        await connect('grant-a', 'google-1'),
        await connect('grant-a'),
        await connect('grant-d', 'google-1'),
        await connect('grant-e', 'google-2'),
        await connect('grant-b'),
        await connect('grant-c'),
        await connect('grant-c'),
        await connect('grant-f', 'google-1', otherApp),
      ];
    expect(await runRevoke(deps(providers), await disconnected('disconnected', revokedId))).toBe(
      'revoked',
    );
    failure = { kind: 'permanent', code: 'unauthorized_client' };
    expect(await runRevoke(deps(providers), await disconnected('disconnected', refusedId))).toBe(
      'refused',
    );
    const rows = await fixture.owner.withActor(SYSTEM, (trx) =>
      trx
        .selectFrom('social_accounts')
        .select(['id', 'status', 'status_reason'])
        .where('id', 'in', [sibling, sameSubject, otherSubject, other, spared, otherProject])
        .execute(),
    );
    expect(rows).toEqual(
      expect.arrayContaining([
        { id: sibling, status: 'needs_reauth', status_reason: 'grant_revoked' },
        { id: sameSubject, status: 'needs_reauth', status_reason: 'grant_revoked' },
        { id: otherSubject, status: 'active', status_reason: null },
        { id: other, status: 'active', status_reason: null },
        { id: spared, status: 'active', status_reason: null },
        { id: otherProject, status: 'active', status_reason: null },
      ]),
    );
  });
});
