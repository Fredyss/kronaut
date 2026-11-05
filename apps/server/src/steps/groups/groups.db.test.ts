import { decodePublicId, encodePublicId } from '@kronaut/core';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  type Auth,
  accountA,
  accountB,
  call,
  errorOf,
  grantAuth,
  insertAccount,
  insertGrant,
  owner,
  ownerAuth,
  ownerId,
  SYSTEM,
  startPosts,
  stopPosts,
  workspaceId,
} from '../../flow/posts/testing.ts';
import { addMember } from '../approvals/testing.ts';
import {
  type GroupDto,
  internalGroup,
  join,
  leave,
  memberCall,
  newGroup,
  pickedPost,
} from './testing.ts';

const GHOST = '0190a0a0-0000-7000-8000-000000000000';

let test: TestDatabase;

beforeAll(async () => {
  test = await startTestDatabase();
  await startPosts(test);
});

afterAll(async () => {
  await stopPosts();
  await test?.stop();
});

async function listed(auth = ownerAuth): Promise<GroupDto[]> {
  const response = await call('GET', 'groups', auth);
  expect(response.status).toBe(200);
  return ((await response.json()) as { items: GroupDto[] }).items;
}

function groupAudits(group: GroupDto) {
  return owner.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('audit_events')
      .select(['action', 'actor_id', 'account_group_id', 'social_account_ids', 'args_summary'])
      .where('workspace_id', '=', workspaceId)
      .where('resource_kind', '=', 'account_group')
      .where('resource_id', '=', internalGroup(group))
      .orderBy('occurred_at')
      .orderBy('id')
      .execute(),
  );
}

function internalAccount(accountId: string): string {
  return decodePublicId('socialAccount', accountId) ?? '';
}

describe('account groups', () => {
  it('creates a group with a normalized name, and audits it', async () => {
    const group = await newGroup('  Kávìčka  ');
    expect(group).toEqual({
      id: expect.stringMatching(/^grp_/),
      name: 'Kávìčka'.normalize('NFC'),
      channelIds: [],
    });
    const row = await owner.withActor(SYSTEM, (trx) =>
      trx
        .selectFrom('account_groups')
        .select('created_by')
        .where('id', '=', internalGroup(group))
        .executeTakeFirstOrThrow(),
    );
    expect(row.created_by).toBe(ownerId);
    expect(await groupAudits(group)).toEqual([
      expect.objectContaining({
        action: 'account_group.created',
        actor_id: ownerId,
        account_group_id: internalGroup(group),
      }),
    ]);
  });

  it('refuses a name taken in any case', async () => {
    const taken = await newGroup('Northwind');
    for (const name of ['Northwind', 'NORTHWIND']) {
      const response = await call('POST', 'groups', ownerAuth, { name });
      expect(response.status).toBe(409);
      expect((await errorOf(response)).code).toBe('group_name_taken');
    }
    const other = await newGroup('Southwind');
    const renamed = await call('PATCH', `groups/${other.id}`, ownerAuth, { name: 'northWIND' });
    expect(renamed.status).toBe(409);
    expect((await errorOf(renamed)).code).toBe('group_name_taken');
    expect(
      (await call('PATCH', `groups/${taken.id}`, ownerAuth, { name: 'Northwind' })).status,
    ).toBe(200);
  });

  it.each([
    ['empty', '   '],
    ['too long', 'x'.repeat(121)],
  ])('refuses a name that is %s', async (_label, name) => {
    const response = await call('POST', 'groups', ownerAuth, { name });
    expect(response.status).toBe(422);
    expect((await errorOf(response)).details).toEqual([
      { path: 'body.name', code: 'name_invalid' },
    ]);
  });

  it('renames a group, and audits it', async () => {
    const group = await newGroup('Contoso');
    const response = await call('PATCH', `groups/${group.id}`, ownerAuth, { name: 'Contoso Ltd' });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ id: group.id, name: 'Contoso Ltd' });
    expect((await groupAudits(group)).map((audit) => audit.action)).toEqual([
      'account_group.created',
      'account_group.renamed',
    ]);
  });

  it('adds and removes channels idempotently, auditing each change once', async () => {
    const group = await newGroup('Members');
    await join(group, accountB, accountA, accountB);
    const [listedGroup] = (await listed()).filter((item) => item.id === group.id);
    expect(listedGroup?.channelIds).toEqual([accountA, accountB]);
    await leave(group, accountA);
    await leave(group, accountA);
    expect((await listed()).find((item) => item.id === group.id)?.channelIds).toEqual([accountB]);
    expect(
      (await groupAudits(group)).map((audit) => [audit.action, audit.social_account_ids]),
    ).toEqual([
      ['account_group.created', null],
      ['account_group.channel_added', [internalAccount(accountB)]],
      ['account_group.channel_added', [internalAccount(accountA)]],
      ['account_group.channel_removed', [internalAccount(accountA)]],
    ]);
  });

  it('gives 404 for an unknown group or channel', async () => {
    const group = await newGroup('Not found');
    const ghostGroup = encodePublicId('group', GHOST);
    const ghostChannel = encodePublicId('socialAccount', GHOST);
    for (const method of ['PUT', 'DELETE'] as const) {
      expect((await memberCall(method, ghostGroup, accountA)).status).toBe(404);
      expect((await memberCall(method, group.id, ghostChannel)).status).toBe(404);
    }
    expect((await call('PATCH', `groups/${ghostGroup}`, ownerAuth, { name: 'x' })).status).toBe(
      404,
    );
    expect((await call('DELETE', `groups/${ghostGroup}`, ownerAuth)).status).toBe(404);
  });

  it('deletes a group, keeping the posts picked through it', async () => {
    const group = await newGroup('Doomed');
    await join(group, accountA);
    const post = await pickedPost([accountA, group.id]);
    expect(post.destinations[0]?.sourceGroupId).toBe(group.id);
    expect((await call('DELETE', `groups/${group.id}`, ownerAuth)).status).toBe(204);
    expect((await listed()).some((item) => item.id === group.id)).toBe(false);
    const after = await call('GET', `posts/${post.id}`, ownerAuth);
    const body = (await after.json()) as typeof post;
    expect(body.destinations.map((d) => [d.accountId, d.sourceGroupId])).toEqual([
      [accountA, null],
    ]);
    const members = await owner.withActor(SYSTEM, (trx) =>
      trx
        .selectFrom('account_group_members')
        .select('social_account_id')
        .where('group_id', '=', internalGroup(group))
        .execute(),
    );
    expect(members).toEqual([]);
    expect((await groupAudits(group)).at(-1)?.action).toBe('account_group.deleted');
  });

  it('puts the group ids on each listed channel, by group name', async () => {
    const zulu = await newGroup('zz channel list');
    const alpha = await newGroup('aa channel list');
    await join(zulu, accountA);
    await join(alpha, accountA);
    const response = await call('GET', 'channels', ownerAuth);
    expect(response.status).toBe(200);
    const { items } = (await response.json()) as { items: { id: string; groupIds: string[] }[] };
    const channel = items.find((item) => item.id === accountA);
    expect(channel?.groupIds.filter((id) => id === zulu.id || id === alpha.id)).toEqual([
      alpha.id,
      zulu.id,
    ]);
    expect(items.every((item) => Array.isArray(item.groupIds))).toBe(true);
  });

  it('gives a grant without groups:read no group ids on channels', async () => {
    const group = await newGroup('aa hidden from grants');
    await join(group, accountA);
    const channelsOf = async (auth: Auth) => {
      const response = await call('GET', 'channels', auth);
      expect(response.status).toBe(200);
      return ((await response.json()) as { items: { id: string; groupIds: string[] }[] }).items;
    };
    const blind = await channelsOf(await insertGrant({ scopes: ['channels:read'] }));
    expect(blind.length).toBeGreaterThan(0);
    expect(blind.every((item) => item.groupIds.length === 0)).toBe(true);
    const reader = await insertGrant({ scopes: ['channels:read', 'groups:read'] });
    const seen = (await channelsOf(reader)).find((item) => item.id === accountA);
    expect(seen?.groupIds).toContain(group.id);
  });
});

describe('group access', () => {
  it('lets a scoped grant see only the groups and channels in its scope', async () => {
    const accountC = await insertAccount('Group scope C');
    const shared = await newGroup('aaa scoped shared');
    const hidden = await newGroup('aaa scoped hidden');
    await join(shared, accountA, accountC);
    await join(hidden, accountC);
    const reader = await insertGrant({ scopes: ['groups:read'] });
    expect((await listed(reader)).length).toBe((await listed()).length);
    const scoped = await insertGrant({ scopes: ['groups:read'], accounts: [accountA] });
    const seen = await listed(scoped);
    expect(seen.find((item) => item.id === shared.id)?.channelIds).toEqual([accountA]);
    expect(seen.some((item) => item.id === hidden.id)).toBe(false);
    expect(seen.every((item) => item.channelIds.every((id) => id === accountA))).toBe(true);
    expect((await call('GET', 'groups', grantAuth)).status).toBe(403);
  });

  it('refuses writes from grants and from members without groups:write', async () => {
    const editor = await addMember('group-editor', false);
    const group = await newGroup('Guarded');
    const writes = [
      ['POST', 'groups', { name: 'Grant group' }],
      ['PATCH', `groups/${group.id}`, { name: 'Grant rename' }],
      ['DELETE', `groups/${group.id}`, undefined],
      ['PUT', `groups/${group.id}/channels/${accountA}`, undefined],
      ['DELETE', `groups/${group.id}/channels/${accountA}`, undefined],
    ] as const;
    for (const [method, path, body] of writes) {
      expect((await call(method, path, grantAuth, body)).status).toBe(401);
      expect((await call(method, path, editor.auth, body)).status).toBe(403);
    }
    expect((await listed()).find((item) => item.id === group.id)).toEqual({
      id: group.id,
      name: 'Guarded',
      channelIds: [],
    });
  });
});
