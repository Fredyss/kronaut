import { decodePublicId, encodePublicId } from '@kronaut/core';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import { sql } from 'kysely';
import { pino } from 'pino';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { openRequestOf, requested } from '../approvals/testing.ts';
import type { PostDto } from '../posts/dto.ts';
import {
  type Auth,
  accountA,
  BASE,
  CLI,
  call,
  create,
  createUser,
  db,
  draft,
  errorOf,
  fake,
  internal,
  keyring,
  login,
  media,
  owner,
  ownerAuth,
  ownerId,
  providers,
  SYSTEM,
  scheduled,
  startPosts,
  stopPosts,
  viewerAuth,
  workspaceId,
} from '../posts/testing.ts';
import { publishDeps, runPublish } from '../publish/task.ts';

interface TagDto {
  readonly id: string;
  readonly name: string;
  readonly color: string;
  readonly postCount: number;
}

let test: TestDatabase;
let contributorAuth: Auth;
let foreignTag: string;

beforeAll(async () => {
  test = await startTestDatabase();
  await startPosts(test);
  const id = await createUser('contributor');
  await owner.withActor(CLI, (trx) =>
    trx
      .insertInto('memberships')
      .values({ workspace_id: workspaceId, user_id: id, role: 'contributor' })
      .execute(),
  );
  contributorAuth = await login('contributor');
  foreignTag = await insertForeignTag();
});

afterAll(async () => {
  await stopPosts();
  await test?.stop();
});

async function newTag(name: string, auth: Auth = ownerAuth): Promise<TagDto> {
  const response = await call('POST', 'tags', auth, { name, color: 'teal' });
  expect(response.status).toBe(201);
  return (await response.json()) as TagDto;
}

function setTags(post: PostDto, tagIds: readonly string[], auth: Auth = ownerAuth) {
  return call('PUT', `posts/${post.id}/tags`, auth, { tagIds });
}

async function read(post: PostDto): Promise<PostDto> {
  return (await (await call('GET', `posts/${post.id}`, ownerAuth)).json()) as PostDto;
}

async function listed(query: string): Promise<string[]> {
  const response = await call('GET', `posts?${query}`, ownerAuth);
  expect(response.status).toBe(200);
  const { items } = (await response.json()) as { items: { id: string }[] };
  return items.map((item) => item.id);
}

function auditsOf(post: PostDto) {
  return owner.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('audit_events')
      .select('action')
      .where('resource_id', '=', internal(post.id))
      .where('action', '=', 'post.tags_changed')
      .execute(),
  );
}

async function insertForeignTag(): Promise<string> {
  const other = await db.withActor({ kind: 'user', id: ownerId }, async (trx) => {
    const result = await sql<{ workspace_id: string }>`
      select workspace_id from provision_organization('Other', 'Other', 'ws-other', 'Europe/Bratislava')
    `.execute(trx);
    return result.rows[0]?.workspace_id ?? '';
  });
  const { id } = await owner.withActor(CLI, (trx) =>
    trx
      .insertInto('tags')
      .values({ workspace_id: other, name: 'Foreign', color: 'red' })
      .returning('id')
      .executeTakeFirstOrThrow(),
  );
  return encodePublicId('tag', id);
}

async function published(): Promise<PostDto> {
  const post = await scheduled(await create(ownerAuth, draft()));
  const destination = decodePublicId('destination', post.destinations[0]?.id ?? '') ?? '';
  await owner.withActor(SYSTEM, (trx) =>
    sql`update post_destinations set run_at = now() - interval '1 second' where id = ${destination}`.execute(
      trx,
    ),
  );
  fake.script({ kind: 'publish', remoteId: 'r-tags' });
  const deps = publishDeps({
    db,
    providers,
    keyring,
    media,
    logger: pino({ level: 'silent' }),
    workerId: 'tags-test',
    publicBaseUrl: BASE,
  });
  await runPublish(deps, { workspaceId, id: destination });
  expect((await read(post)).destinations[0]?.state).toBe('published');
  return post;
}

describe('the tag list', () => {
  it('creates a tag with a normalized name', async () => {
    const tag = await newTag('  Café ');
    expect(tag).toMatchObject({ name: 'Café', color: 'teal', postCount: 0 });
  });

  it('refuses a name that differs only in case, and one that is empty', async () => {
    await newTag('Launch');
    const taken = await call('POST', 'tags', ownerAuth, { name: 'LAUNCH', color: 'red' });
    expect(taken.status).toBe(409);
    expect((await errorOf(taken)).code).toBe('tag_exists');
    const empty = await call('POST', 'tags', ownerAuth, { name: '   ', color: 'red' });
    expect(empty.status).toBe(422);
  });

  it('renames and recolors, and refuses a taken name', async () => {
    const tag = await newTag('Old name');
    await newTag('Taken name');
    const renamed = await call('PATCH', `tags/${tag.id}`, ownerAuth, {
      name: 'New name',
      color: 'blue',
    });
    expect(await renamed.json()).toMatchObject({ name: 'New name', color: 'blue' });
    const taken = await call('PATCH', `tags/${tag.id}`, ownerAuth, { name: 'taken NAME' });
    expect(taken.status).toBe(409);
  });

  it('removes a deleted tag from its posts', async () => {
    const tag = await newTag('Short lived');
    const post = await create(ownerAuth, draft());
    await setTags(post, [tag.id]);
    expect((await call('DELETE', `tags/${tag.id}`, ownerAuth)).status).toBe(204);
    expect((await read(post)).tags).toEqual([]);
  });

  it('lets a contributor create a tag but not rename or delete one', async () => {
    const tag = await newTag('Theirs', contributorAuth);
    const renamed = await call('PATCH', `tags/${tag.id}`, contributorAuth, { name: 'Mine' });
    expect(renamed.status).toBe(403);
    expect((await call('DELETE', `tags/${tag.id}`, contributorAuth)).status).toBe(403);
  });

  it('counts only the live posts of a tag', async () => {
    const tag = await newTag('Counted');
    const [kept, deleted] = [await create(ownerAuth, draft()), await create(ownerAuth, draft())];
    await setTags(kept, [tag.id]);
    await setTags(deleted, [tag.id]);
    await call('DELETE', `posts/${deleted.id}`, ownerAuth);
    const response = await call('GET', 'tags', ownerAuth);
    const { items } = (await response.json()) as { items: TagDto[] };
    expect(items.find((item) => item.id === tag.id)?.postCount).toBe(1);
  });

  it('stops at 200 tags in a workspace', async () => {
    const { items } = (await (await call('GET', 'tags', ownerAuth)).json()) as { items: TagDto[] };
    const names = Array.from({ length: 200 - items.length }, (_, index) => `Bulk ${index}`);
    await owner.withActor(CLI, (trx) =>
      trx
        .insertInto('tags')
        .values(names.map((name) => ({ workspace_id: workspaceId, name, color: 'slate' })))
        .execute(),
    );
    const response = await call('POST', 'tags', ownerAuth, { name: 'One more', color: 'red' });
    expect(response.status).toBe(409);
    expect((await errorOf(response)).code).toBe('tag_limit');
    await owner.withActor(CLI, (trx) =>
      trx.deleteFrom('tags').where('name', 'in', names).execute(),
    );
  });
});

describe('a post and its tags', () => {
  it.each([
    ['draft', async () => await create(ownerAuth, draft())],
    ['scheduled', async () => await scheduled(await create(ownerAuth, draft()))],
    ['published', published],
  ])('tags a %s post without changing its version', async (name, make) => {
    const post = await make();
    const before = await read(post);
    const tag = await newTag(`State ${name}`);
    const response = await setTags(post, [tag.id]);
    expect(response.status).toBe(200);
    const after = await read(post);
    expect(after.publishSummary).toBe(before.publishSummary);
    expect(after.version).toBe(before.version);
    expect(after.tags).toEqual([{ id: tag.id, name: tag.name, color: tag.color }]);
  });

  it('leaves an open approval request alone', async () => {
    const post = await requested(await create(ownerAuth, draft()));
    const before = await openRequestOf(post);
    const tag = await newTag('During approval');
    expect((await setTags(post, [tag.id])).status).toBe(200);
    expect(await openRequestOf(post)).toEqual(before);
  });

  it('orders tags by name and audits only a real change', async () => {
    const post = await create(ownerAuth, draft());
    const [zebra, apple] = [await newTag('Zebra'), await newTag('apple')];
    await setTags(post, [zebra.id, apple.id]);
    await setTags(post, [apple.id, zebra.id]);
    expect((await read(post)).tags.map((tag) => tag.name)).toEqual(['apple', 'Zebra']);
    expect(await auditsOf(post)).toHaveLength(1);
  });

  it('refuses a tag of another workspace and an unknown id', async () => {
    const post = await create(ownerAuth, draft());
    const response = await setTags(post, [foreignTag, 'nonsense']);
    expect(response.status).toBe(422);
    expect((await errorOf(response)).details).toEqual([
      { path: 'body.tagIds.0', code: 'tag_unknown' },
      { path: 'body.tagIds.1', code: 'tag_unknown' },
    ]);
  });

  it('does not find a deleted post', async () => {
    const post = await create(ownerAuth, draft());
    await call('DELETE', `posts/${post.id}`, ownerAuth);
    expect((await setTags(post, [])).status).toBe(404);
  });

  it('refuses a viewer', async () => {
    const post = await create(ownerAuth, draft());
    expect((await setTags(post, [], viewerAuth)).status).toBe(403);
  });

  it('keeps the tags on a duplicate', async () => {
    const source = await create(ownerAuth, draft());
    const tag = await newTag('Copied');
    await setTags(source, [tag.id]);
    const response = await call('POST', `posts/${source.id}/duplicate`, ownerAuth);
    expect(response.status).toBe(201);
    expect(((await response.json()) as PostDto).tags.map((item) => item.id)).toEqual([tag.id]);
  });
});

describe('filtering posts by tag', () => {
  it('narrows the drafts and the range list, and unknown tags list nothing', async () => {
    const tag = await newTag('Filtered');
    const [tagged, other] = [await create(ownerAuth, draft()), await create(ownerAuth, draft())];
    await setTags(tagged, [tag.id]);
    expect(await listed(`unscheduled=true&tag=${tag.id}`)).toEqual([tagged.id]);
    expect(await listed('unscheduled=true')).toContain(other.id);
    expect(await listed(`unscheduled=true&tag=${foreignTag}`)).toEqual([]);
    expect(await listed('unscheduled=true&tag=nonsense')).toEqual([]);

    const planned = await scheduled(await create(ownerAuth, draft(accountA)), '2031-05-05T10:00');
    const dated = await scheduled(await create(ownerAuth, draft(accountA)), '2031-05-05T11:00');
    await setTags(planned, [tag.id]);
    const range = 'from=2031-05-01T00:00:00Z&to=2031-05-10T00:00:00Z';
    expect(await listed(range)).toEqual(expect.arrayContaining([planned.id, dated.id]));
    expect(await listed(`${range}&tag=${tag.id}`)).toEqual([planned.id]);
  });
});
