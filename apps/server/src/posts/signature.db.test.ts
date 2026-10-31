import { decodePublicId, encodePublicId } from '@kronaut/core';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import { sql } from 'kysely';
import { pino } from 'pino';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  addMember,
  decided,
  type Member,
  openRequestOf,
  requested,
  setPolicy,
  withdrawCall,
} from '../approvals/testing.ts';
import { publishDeps, runPublish } from '../publish/task.ts';
import { fakeManifest } from '../publish/testing.ts';
import { contentHashInput, parseSnapshot, publishItems, resolveDestination } from '../snapshot.ts';
import type { PostDto } from './dto.ts';
import {
  accountA,
  accountB,
  BASE,
  CLI,
  call,
  create,
  db,
  doc,
  draft,
  errorOf,
  fake,
  inMinutes,
  insertGrant,
  internal,
  keyring,
  media,
  owner,
  ownerAuth,
  providers,
  readyMedia,
  SYSTEM,
  scheduleCall,
  scheduled,
  startPosts,
  stopPosts,
  TZ,
  viewerAuth,
  workspaceId,
} from './testing.ts';

interface Text {
  readonly id: string;
}

let test: TestDatabase;
let approver: Member;
let serial = 0;

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

afterEach(() => {
  fake.configureChain({});
});

async function savedText(text: string): Promise<Text> {
  serial += 1;
  const response = await call('POST', 'saved-texts', ownerAuth, {
    name: `Text ${serial}`,
    doc: doc(text),
  });
  expect(response.status).toBe(201);
  return (await response.json()) as Text;
}

function signCall(savedTextId: string | null, accountId: string) {
  return call('PUT', `channels/${accountId}/saved-text`, ownerAuth, { savedTextId });
}

async function sign(savedTextId: string | null, accountId: string = accountA) {
  expect((await signCall(savedTextId, accountId)).status).toBe(200);
}

function row(post: PostDto) {
  return owner.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('post_destinations')
      .select(['id', 'state', 'content_hash', 'frozen_post_version', 'frozen_signature'])
      .where('post_id', '=', internal(post.id))
      .executeTakeFirstOrThrow(),
  );
}

async function rendered(post: PostDto) {
  const { frozen_post_version: version } = await row(post);
  const { snapshot } = await owner.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('post_revisions')
      .select('snapshot')
      .where('post_id', '=', internal(post.id))
      .where('post_version', '=', version ?? 0)
      .executeTakeFirstOrThrow(),
  );
  const parsed = parseSnapshot(snapshot);
  const [destination] = parsed.destinations;
  if (destination === undefined) throw new Error('the snapshot has no destination');
  const key = { socialAccountId: destination.socialAccountId, publishType: 'post' };
  return { destination, items: publishItems(resolveDestination(parsed, key)) };
}

function texts({ items }: Awaited<ReturnType<typeof rendered>>) {
  return items.map((item) => item.text);
}

async function publishNow(post: PostDto) {
  const { id } = await row(post);
  await owner.withActor(SYSTEM, (trx) =>
    sql`update post_destinations set run_at = now() - interval '1 second' where id = ${id}`.execute(
      trx,
    ),
  );
  fake.script({ kind: 'publish', remoteId: `r-${id}` });
  const deps = publishDeps({
    db,
    providers,
    keyring,
    media,
    logger: pino({ level: 'silent' }),
    workerId: 'signature-test',
    publicBaseUrl: BASE,
  });
  await runPublish(deps, { workspaceId, id });
}

function reschedule(post: PostDto) {
  return call('POST', `posts/${post.id}/reschedule`, ownerAuth, {
    expectedVersion: post.version,
    scheduleLocal: inMinutes(180),
    scheduleTz: TZ,
  });
}

describe('channel signature at freeze', () => {
  it('is in the frozen text, the hash and the rendered item', async () => {
    const plain = await scheduled(await create(ownerAuth, draft()));
    const { id } = await savedText('Podpis');
    await sign(id);
    const post = await scheduled(await create(ownerAuth, draft()));
    expect(texts(await rendered(post))).toEqual(['Ahoj\nPodpis']);
    expect(post.destinations[0]).toMatchObject({
      skipSignature: false,
      signature: doc('Podpis'),
    });
    const [signedRow, plainRow] = [await row(post), await row(plain)];
    expect(signedRow.content_hash?.equals(plainRow.content_hash ?? Buffer.alloc(0))).toBe(false);
    expect(post.items[0]?.doc).toEqual(doc('Ahoj'));
  });

  it('counts the signature against the text limit at preflight', async () => {
    const { id } = await savedText('x'.repeat(200));
    await sign(id);
    const post = await create(ownerAuth, {
      ...draft(),
      items: [{ doc: doc('y'.repeat(200)) }],
    });
    const response = await scheduleCall(post, {
      mode: 'instant',
      scheduleLocal: inMinutes(120),
      scheduleTz: TZ,
    });
    expect(response.status).toBe(422);
    expect(await errorOf(response)).toMatchObject({
      code: 'preflight_failed',
      details: [{ path: 'destinations.0', code: 'text_too_long' }],
    });
  });

  it('leaves a scheduled post alone when the channel changes, and the claim still matches', async () => {
    const { id } = await savedText('Starý');
    await sign(id);
    const post = await scheduled(await create(ownerAuth, draft()));
    const before = await row(post);
    await sign((await savedText('Nový')).id);
    expect(await row(post)).toEqual(before);
    await publishNow(post);
    expect((await row(post)).state).toBe('published');
  });

  it('keeps a frozen signature when its saved text is deleted', async () => {
    const { id } = await savedText('Zmizne');
    await sign(id);
    const post = await scheduled(await create(ownerAuth, draft()));
    expect((await call('DELETE', `saved-texts/${id}`, ownerAuth)).status).toBe(204);
    expect(texts(await rendered(post))).toEqual(['Ahoj\nZmizne']);
    await publishNow(post);
    expect((await row(post)).state).toBe('published');
  });

  it('takes the current signature when rescheduled', async () => {
    await sign((await savedText('Starý')).id);
    const post = await scheduled(await create(ownerAuth, draft()));
    await sign((await savedText('Nový')).id);
    const response = await reschedule(post);
    expect(response.status).toBe(200);
    const moved = (await response.json()) as PostDto;
    expect(texts(await rendered(moved))).toEqual(['Ahoj\nNový']);
    expect(moved.destinations[0]?.signature).toEqual(doc('Nový'));
  });

  it('clears the frozen copy on unschedule and when the channel has none at the next freeze', async () => {
    await sign((await savedText('Starý')).id);
    const post = await scheduled(await create(ownerAuth, draft()));
    await sign(null);
    const response = await call('POST', `posts/${post.id}/unschedule`, ownerAuth, {
      expectedVersion: post.version,
    });
    expect(response.status).toBe(200);
    const back = (await response.json()) as PostDto;
    expect(back.destinations[0]?.signature).toBeNull();
    const again = await scheduled(back);
    expect(again.destinations[0]?.signature).toBeNull();
    expect('signature' in (await rendered(again)).destination).toBe(false);
  });

  it('a required approval refuses a reschedule that changes the hash', async () => {
    await setPolicy({ mode: 'required', allow_self_approval: false, reschedule_tolerance_min: 60 });
    await sign((await savedText('Starý')).id);
    const local = inMinutes(120);
    const created = await create(ownerAuth, draft());
    const post = await requested(created);
    const request = await openRequestOf(post);
    await decided(request, 'approve', approver.auth);
    const approved = await scheduled(
      (await (await call('GET', `posts/${post.id}`, ownerAuth)).json()) as PostDto,
      local,
    );
    await sign((await savedText('Nový')).id);
    const response = await call('POST', `posts/${post.id}/reschedule`, ownerAuth, {
      expectedVersion: approved.version,
      scheduleLocal: local,
      scheduleTz: TZ,
    });
    expect(response.status).toBe(403);
    expect(texts(await rendered(approved))).toEqual(['Ahoj\nStarý']);
  });

  it('skips a destination that opts out, and a duplicate keeps the flag', async () => {
    await sign((await savedText('Podpis')).id);
    const [destination] = draft().destinations;
    const post = await create(ownerAuth, {
      ...draft(),
      destinations: [{ ...destination, skipSignature: true }],
    });
    expect(post.destinations[0]?.skipSignature).toBe(true);
    const frozen = await scheduled(post);
    expect(texts(await rendered(frozen))).toEqual(['Ahoj']);
    expect('signature' in (await rendered(frozen)).destination).toBe(false);
    const response = await call('POST', `posts/${post.id}/duplicate`, ownerAuth);
    expect(((await response.json()) as PostDto).destinations[0]?.skipSignature).toBe(true);
  });

  it('adds nothing to a blank main text with media', async () => {
    await sign((await savedText('Podpis')).id);
    const post = await create(ownerAuth, {
      ...draft(),
      items: [{ doc: doc(' '), media: [{ mediaId: readyMedia, altText: 'Obrázok' }] }],
    });
    expect(texts(await rendered(await scheduled(post)))).toEqual([' ']);
  });

  it('goes on the main item of a thread only', async () => {
    const postType = fakeManifest.postTypes[0];
    if (postType === undefined) throw new Error('the fake provider has no post type');
    fake.configureChain({ thread: { maxItems: 5, media: postType.media } });
    await sign((await savedText('Podpis')).id);
    const post = await create(ownerAuth, {
      ...draft(),
      items: [{ doc: doc('Hlavný') }, { role: 'thread', doc: doc('Odpoveď') }],
    });
    expect(texts(await rendered(await scheduled(post)))).toEqual(['Hlavný\nPodpis', 'Odpoveď']);
  });

  it('hashes an old snapshot without the key as before', () => {
    const base = {
      v: 1,
      postId: '00000000-0000-4000-8000-000000000001',
      postVersion: 1,
      variants: [
        {
          id: '00000000-0000-4000-8000-000000000002',
          isDefault: true,
          contentLanguage: null,
          items: [{ position: 0, role: 'main', doc: doc('Ahoj'), docSchemaV: 1, media: [] }],
        },
      ],
      destinations: [
        {
          socialAccountId: '00000000-0000-4000-8000-000000000003',
          provider: 'fake',
          publishType: 'post',
          variantId: '00000000-0000-4000-8000-000000000002',
          deliveryMode: 'auto',
          settings: {},
        },
      ],
    };
    const parsed = parseSnapshot(base);
    expect(JSON.stringify(parsed)).toBe(JSON.stringify(base));
    const key = { socialAccountId: '00000000-0000-4000-8000-000000000003', publishType: 'post' };
    expect(contentHashInput(resolveDestination(parsed, key)).items[0]?.doc).toEqual(doc('Ahoj'));
  });
});

async function fetched(post: PostDto) {
  return (await (await call('GET', `posts/${post.id}`, ownerAuth)).json()) as PostDto;
}

describe('channel signature under review', () => {
  beforeEach(async () => {
    await setPolicy({ mode: 'required', allow_self_approval: false, reschedule_tolerance_min: 0 });
  });

  it('holds the frozen signature for an open request, and lets go on withdraw', async () => {
    await sign((await savedText('Starý')).id);
    const post = await requested(await create(ownerAuth, draft()));
    const request = await openRequestOf(post);
    await sign((await savedText('Nový')).id);
    expect((await fetched(post)).destinations[0]).toMatchObject({
      state: 'draft',
      signature: doc('Starý'),
      signatureHeld: true,
    });
    expect((await withdrawCall(request, ownerAuth)).status).toBe(200);
    expect((await fetched(post)).destinations[0]).toMatchObject({
      state: 'draft',
      signature: null,
      signatureHeld: false,
    });
  });

  it('holds no signature for a request frozen without one', async () => {
    const post = await requested(await create(ownerAuth, draft()));
    await sign((await savedText('Nový')).id);
    expect((await fetched(post)).destinations[0]).toMatchObject({
      signature: null,
      signatureHeld: true,
    });
  });

  it('holds a frozen destination and leaves a plain draft to the channel', async () => {
    await setPolicy({ mode: 'none', allow_self_approval: true, reschedule_tolerance_min: 0 });
    await sign((await savedText('Podpis')).id);
    const plain = await create(ownerAuth, draft());
    expect(plain.destinations[0]).toMatchObject({ signature: null, signatureHeld: false });
    expect((await scheduled(plain)).destinations[0]?.signatureHeld).toBe(true);
  });
});

describe('skip_signature guard', () => {
  function dirty(post: PostDto) {
    return owner.withActor(SYSTEM, (trx) =>
      trx
        .selectFrom('posts')
        .select('agent_dirty')
        .where('id', '=', internal(post.id))
        .executeTakeFirstOrThrow(),
    );
  }

  it('marks the post agent_dirty when a grant changes the flag', async () => {
    const key = await insertGrant({ scopes: ['posts:read', 'posts:draft'] });
    const post = await create(ownerAuth, draft());
    const patch = async (skipSignature: boolean, expectedVersion: number) => {
      const [destination] = draft().destinations;
      const response = await call('PATCH', `posts/${post.id}`, key, {
        expectedVersion,
        destinations: [{ ...destination, skipSignature }],
      });
      expect(response.status).toBe(200);
      return (await response.json()) as PostDto;
    };
    const same = await patch(false, post.version);
    expect(await dirty(post)).toEqual({ agent_dirty: false });
    await patch(true, same.version);
    expect(await dirty(post)).toEqual({ agent_dirty: true });
  });

  it('refuses a change on a frozen destination without a new freeze', async () => {
    const post = await scheduled(await create(ownerAuth, draft()));
    const { id } = await row(post);
    await expect(
      owner.withActor(SYSTEM, (trx) =>
        trx
          .updateTable('post_destinations')
          .set({ skip_signature: true })
          .where('id', '=', id)
          .execute(),
      ),
    ).rejects.toMatchObject({ code: 'KR003' });
  });
});

describe('channel signature route', () => {
  it('shows the signature on the channel and counts channels on the saved text', async () => {
    const { id } = await savedText('Podpis');
    await sign(id);
    await sign(id, accountB);
    const channels = (await (await call('GET', 'channels', ownerAuth)).json()) as {
      readonly items: readonly { readonly id: string; readonly signature: unknown }[];
    };
    expect(channels.items.find((c) => c.id === accountA)?.signature).toMatchObject({
      id,
      doc: doc('Podpis'),
    });
    const list = (await (await call('GET', 'saved-texts', ownerAuth)).json()) as {
      readonly items: readonly (Text & { readonly channelCount: number })[];
    };
    expect(list.items.find((t) => t.id === id)?.channelCount).toBe(2);
  });

  it('writes an audit row without the text', async () => {
    const { id } = await savedText('Tajný podpis');
    await sign(id);
    const audit = await owner.withActor(CLI, (trx) =>
      trx
        .selectFrom('audit_events')
        .select(['resource_kind', 'args_summary'])
        .where('action', '=', 'channel.signature_updated')
        .where('resource_id', '=', decodePublicId('socialAccount', accountA))
        .orderBy('occurred_at', 'desc')
        .executeTakeFirstOrThrow(),
    );
    expect(audit.resource_kind).toBe('social_account');
    expect(JSON.stringify(audit)).not.toContain('Tajný');
  });

  it('refuses an unknown or foreign saved text with 422', async () => {
    const stranger = encodePublicId('savedText', '00000000-0000-4000-8000-00000000abcd');
    const response = await signCall(stranger, accountA);
    expect(response.status).toBe(422);
    expect(await errorOf(response)).toMatchObject({
      details: [{ path: 'body.savedTextId', code: 'not_found' }],
    });
    expect((await signCall('nonsense', accountA)).status).toBe(422);
  });

  it('refuses a viewer and a key without settings:write', async () => {
    const { id } = await savedText('Podpis');
    const path = `channels/${accountA}/saved-text`;
    expect((await call('PUT', path, viewerAuth, { savedTextId: id })).status).toBe(403);
    const key = await insertGrant({ scopes: ['posts:read'] });
    expect((await call('PUT', path, key, { savedTextId: id })).status).toBe(401);
  });
});
