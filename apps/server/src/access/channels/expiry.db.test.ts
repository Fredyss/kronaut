import { encodePublicId, type RefreshKind } from '@kronaut/core';
import type { Actor } from '@kronaut/db';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import { Temporal } from 'temporal-polyfill';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { refreshCredential } from '../../steps/publish/refresh/refresh.ts';
import { type PublishFixture, startPublishFixture } from '../../steps/publish/testing.ts';
import { listChannels } from './list.ts';

const SYSTEM: Actor = { kind: 'system' };
const DAY_MS = 24 * 60 * 60 * 1000;

let test: TestDatabase;
let fixture: PublishFixture;

beforeAll(async () => {
  test = await startTestDatabase();
  fixture = await startPublishFixture(test, 'ws-expiry');
});

afterAll(async () => {
  await fixture?.stop();
  await test?.stop();
});

function inDays(days: number): Temporal.Instant {
  return Temporal.Instant.fromEpochMilliseconds(Date.now() + days * DAY_MS);
}

function iso(instant: Temporal.Instant): string {
  return instant.toString({ fractionalSecondDigits: 3 });
}

async function shown(accountId: string): Promise<string | null | undefined> {
  const channels = await fixture.db.withTenant(fixture.workspaceId, SYSTEM, (trx) =>
    listChannels(trx, fixture.workspaceId, fixture.deps.providers, {
      scope: null,
      hideSignatures: false,
      hideGroups: false,
    }),
  );
  const id = encodePublicId('socialAccount', accountId);
  return channels.find((channel) => channel.id === id)?.accessExpiresAt;
}

interface Expiry {
  readonly accessExpiresAt: Temporal.Instant;
  readonly refreshExpiresAt: Temporal.Instant;
}

async function connect(expiry: Expiry): Promise<string> {
  const accountId = await fixture.connectAccount(fixture.appId, expiry);
  await fixture.owner.withActor(SYSTEM, (trx) =>
    trx
      .updateTable('social_accounts')
      .set({
        access_expires_at: new Date(expiry.accessExpiresAt.epochMilliseconds),
        refresh_expires_at: new Date(expiry.refreshExpiresAt.epochMilliseconds),
      })
      .where('id', '=', accountId)
      .execute(),
  );
  return accountId;
}

async function refresh(accountId: string): Promise<void> {
  const { id, version } = await fixture.owner.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('account_credentials')
      .select(['id', 'version'])
      .where('social_account_id', '=', accountId)
      .executeTakeFirstOrThrow(),
  );
  const target = { workspaceId: fixture.workspaceId, credentialId: id, expectedVersion: version };
  expect(await refreshCredential(fixture.deps, target, 'skip')).toMatchObject({
    kind: 'refreshed',
  });
}

interface Case {
  readonly refresh: RefreshKind;
  readonly limit: keyof Expiry;
}

describe('channel expiry', () => {
  it.each<Case>([
    { refresh: 'rotating', limit: 'refreshExpiresAt' },
    { refresh: 'single_use', limit: 'refreshExpiresAt' },
    { refresh: 'reusable', limit: 'refreshExpiresAt' },
    { refresh: 'self_refresh', limit: 'accessExpiresAt' },
  ])('shows the $limit of the current $refresh credential', async ({ refresh: kind, limit }) => {
    fixture.fake.configureAuth({ refresh: kind, warnLeadMs: 0 });
    const connected = { accessExpiresAt: inDays(1), refreshExpiresAt: inDays(2) };
    const refreshed = { accessExpiresAt: inDays(60), refreshExpiresAt: inDays(90) };
    const accountId = await connect(connected);
    expect(await shown(accountId)).toBe(iso(connected[limit]));

    fixture.fake.scriptRefresh({
      kind: 'issue',
      issued: { credentials: { token: 'renewed' }, grantedScopes: [], ...refreshed },
    });
    await refresh(accountId);

    expect(await shown(accountId)).toBe(iso(refreshed[limit]));
  });
});
