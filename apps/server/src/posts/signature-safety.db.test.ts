import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import { sql } from 'kysely';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  addMember,
  decided,
  type Member,
  openRequestOf,
  requested,
  setPolicy,
  withdrawCall,
} from '../approvals/testing.ts';
import {
  act,
  destinationRow,
  internalDestination,
  moveTo,
  type Needed,
  ok,
} from '../destinations/testing.ts';
import type { PostDto } from './dto.ts';
import {
  type Auth,
  accountA,
  accountB,
  call,
  create,
  doc,
  draft,
  errorOf,
  fetched,
  inMinutes,
  insertGrant,
  internal,
  owner,
  ownerAuth,
  rendered,
  SYSTEM,
  savedText,
  scheduleCall,
  scheduled,
  sign,
  startPosts,
  stopPosts,
  TZ,
  texts,
} from './testing.ts';

const AGENT_SCOPES = ['posts:read', 'posts:draft', 'posts:submit'];

let test: TestDatabase;
let approver: Member;

beforeAll(async () => {
  test = await startTestDatabase();
  await startPosts(test);
  approver = await addMember('approver', true);
});

afterAll(async () => {
  await stopPosts();
  await test?.stop();
});

beforeEach(async () => {
  await setPolicy({ mode: 'none', allow_self_approval: true, reschedule_tolerance_min: 0 });
  await sign(null);
  await sign(null, accountB);
});

function row(post: PostDto) {
  return owner.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('post_destinations')
      .select(['state', 'content_hash', 'frozen_signature'])
      .select(['approval_request_id', 'agent_content'])
      .where('post_id', '=', internal(post.id))
      .executeTakeFirstOrThrow(),
  );
}

function revisions(post: PostDto) {
  return owner.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('revision_destinations')
      .select(['content_hash', 'unsigned_hash', 'agent_authored'])
      .where('post_id', '=', internal(post.id))
      .orderBy('post_version')
      .execute(),
  );
}

async function agentRequest(key: Auth) {
  const post = await requested(await create(key, draft()), {}, key);
  return { post, request: await openRequestOf(post) };
}

async function rejectedAgentPost(key: Auth): Promise<PostDto> {
  const { post, request } = await agentRequest(key);
  await decided(request, 'reject', approver.auth);
  return await fetched(post);
}

function asap(post: PostDto) {
  return scheduleCall(post, { mode: 'asap' });
}

async function expectRefused(response: Response, post: PostDto) {
  expect(response.status).toBe(403);
  expect(await errorOf(response)).toMatchObject({ code: 'approval_required' });
  expect((await row(post)).state).toBe('draft');
}

function skipSignature(post: PostDto, auth: Auth) {
  const [destination] = draft().destinations;
  return call('PATCH', `posts/${post.id}`, auth, {
    expectedVersion: post.version,
    destinations: [{ ...destination, skipSignature: true }],
  });
}

describe('agent authorship across a signature change', () => {
  it('survives a rejected post gaining a signature', async () => {
    const post = await rejectedAgentPost(await insertGrant({ scopes: AGENT_SCOPES }));
    await sign((await savedText('Podpis')).id);
    await expectRefused(await asap(post), post);
  });

  it('survives a withdrawn post gaining a signature', async () => {
    const key = await insertGrant({ scopes: AGENT_SCOPES });
    const { post, request } = await agentRequest(key);
    expect((await withdrawCall(request, key)).status).toBe(200);
    await sign((await savedText('Podpis')).id);
    const current = await fetched(post);
    await expectRefused(await asap(current), current);
  });

  it('survives the owner turning the signature off', async () => {
    await sign((await savedText('Podpis')).id);
    const post = await rejectedAgentPost(await insertGrant({ scopes: AGENT_SCOPES }));
    const patched = await ok(await skipSignature(post, ownerAuth));
    await expectRefused(await asap(patched), patched);
  });

  it('clears when the owner edits the text', async () => {
    const post = await rejectedAgentPost(await insertGrant({ scopes: AGENT_SCOPES }));
    await sign((await savedText('Podpis')).id);
    const edited = await ok(
      await call('PATCH', `posts/${post.id}`, ownerAuth, {
        expectedVersion: post.version,
        items: [{ doc: doc('Prepísané') }],
      }),
    );
    expect((await asap(edited)).status).toBe(200);
  });

  it('counts a grant turning the signature off as agent-authored', async () => {
    await sign((await savedText('Podpis')).id);
    const post = await requested(await create(ownerAuth, draft()));
    await decided(await openRequestOf(post), 'reject', approver.auth);
    const key = await insertGrant({ scopes: AGENT_SCOPES });
    const patched = await ok(await skipSignature(await fetched(post), key));
    await expectRefused(await asap(patched), patched);
  });

  it('keeps an approved post bound when a reschedule would change its signature', async () => {
    const { post, request } = await agentRequest(await insertGrant({ scopes: AGENT_SCOPES }));
    await decided(request, 'approve', approver.auth);
    const local = inMinutes(120);
    const approved = await scheduled(await fetched(post), local);
    const before = await row(approved);
    expect(before.agent_content).toBe(true);
    expect(before.approval_request_id).not.toBeNull();
    await sign((await savedText('Podpis')).id);
    const response = await call('POST', `posts/${post.id}/reschedule`, ownerAuth, {
      expectedVersion: approved.version,
      scheduleLocal: local,
      scheduleTz: TZ,
    });
    expect(response.status).toBe(403);
    expect(await row(approved)).toEqual(before);
  });

  it('compares the previous hash with the unsigned hash of the next revision', async () => {
    const post = await rejectedAgentPost(await insertGrant({ scopes: AGENT_SCOPES }));
    await sign((await savedText('Podpis')).id);
    await requested(post);
    const [first, second] = await revisions(post);
    expect(first).toMatchObject({ unsigned_hash: null, agent_authored: true });
    expect(second?.agent_authored).toBe(true);
    expect(second?.unsigned_hash).toEqual(first?.content_hash);
    expect(second?.content_hash).not.toEqual(first?.content_hash);
  });
});

async function inState(post: PostDto, state: Needed) {
  const destinationId = await internalDestination(post);
  await moveTo(destinationId, state);
  const { version } = await destinationRow(destinationId);
  return { post, destinationId, publicId: post.destinations[0]?.id ?? '', version };
}

describe('send again', () => {
  it.each(['failed', 'blocked'] as const)('keeps the binding of a %s post', async (state) => {
    await setPolicy({ mode: 'required', allow_self_approval: false, reschedule_tolerance_min: 0 });
    await sign((await savedText('Starý')).id);
    const post = await requested(await create(ownerAuth, draft()));
    await decided(await openRequestOf(post), 'approve', approver.auth);
    const local = inMinutes(120);
    const approved = await scheduled(await fetched(post), local);
    const before = await row(approved);
    const target = await inState(approved, state);
    await sign((await savedText('Nový')).id);
    const sent = await ok(
      await act(target, 'send-again', { mode: 'instant', scheduleLocal: local, scheduleTz: TZ }),
    );
    expect(texts(await rendered(sent))).toEqual(['Ahoj\nStarý']);
    expect(await row(sent)).toMatchObject({
      state: 'scheduled',
      approval_request_id: before.approval_request_id,
      frozen_signature: doc('Starý'),
    });
  });

  it('stays without a signature when it was frozen without one', async () => {
    const post = await scheduled(await create(ownerAuth, draft()));
    const target = await inState(post, 'failed');
    await sign((await savedText('Nový')).id);
    const sent = await ok(await act(target, 'send-again', { mode: 'asap' }));
    expect(texts(await rendered(sent))).toEqual(['Ahoj']);
    expect('signature' in (await rendered(sent)).destination).toBe(false);
    expect((await row(sent)).frozen_signature).toBeNull();
  });
});

describe('reading a signature', () => {
  it('shows the open request over a stale copy on a voided draft', async () => {
    await sign((await savedText('Starý')).id);
    const post = await scheduled(await create(ownerAuth, draft()));
    const id = await internalDestination(post);
    await owner.withActor(SYSTEM, (trx) =>
      sql`update post_destinations
          set state = 'draft', state_reason = 'approval_voided', version = version + 1
          where id = ${id}`.execute(trx),
    );
    await sign((await savedText('Nový')).id);
    await requested(await fetched(post));
    expect((await row(post)).frozen_signature).toEqual(doc('Starý'));
    expect((await fetched(post)).destinations[0]).toMatchObject({
      state: 'draft',
      signature: doc('Nový'),
      signatureHeld: true,
    });
  });

  it('leaves the saved text out of the channel list without posts:read', async () => {
    await sign((await savedText('Podpis')).id);
    const signatureFor = async (scopes: readonly string[]) => {
      const key = await insertGrant({ scopes });
      const response = await call('GET', 'channels', key);
      expect(response.status).toBe(200);
      const { items } = (await response.json()) as {
        readonly items: readonly { readonly id: string; readonly signature: unknown }[];
      };
      return items.find((channel) => channel.id === accountA)?.signature;
    };
    expect(await signatureFor(['channels:read'])).toBeNull();
    expect(await signatureFor(['channels:read', 'posts:read'])).toMatchObject({
      doc: doc('Podpis'),
    });
  });
});
