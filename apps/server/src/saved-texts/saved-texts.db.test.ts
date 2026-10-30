import { decodePublicId, encodePublicId } from '@kronaut/core';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import { sql } from 'kysely';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { requestAs } from '../http/testing.ts';
import {
  type Auth,
  app,
  BASE,
  CLI,
  call,
  createUser,
  db,
  doc,
  errorOf,
  login,
  owner,
  ownerAuth,
  ownerId,
  startPosts,
  stopPosts,
  viewerAuth,
  workspaceId,
} from '../posts/testing.ts';

interface SavedTextDto {
  readonly id: string;
  readonly name: string;
  readonly doc: unknown;
}

let test: TestDatabase;
let contributorAuth: Auth;
let foreign: { readonly workspace: string; readonly savedText: string };

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
  foreign = await insertForeign();
});

afterAll(async () => {
  await stopPosts();
  await test?.stop();
});

async function insertForeign() {
  const other = await db.withActor({ kind: 'user', id: ownerId }, async (trx) => {
    const result = await sql<{ workspace_id: string }>`
      select workspace_id from provision_organization('Other', 'Other', 'ws-other', 'Europe/Bratislava')
    `.execute(trx);
    return result.rows[0]?.workspace_id ?? '';
  });
  const { id } = await owner.withActor(CLI, (trx) =>
    trx
      .insertInto('saved_texts')
      .values({
        workspace_id: other,
        name: 'Foreign',
        doc: JSON.stringify(doc('Secret')),
        doc_schema_v: 1,
      })
      .returning('id')
      .executeTakeFirstOrThrow(),
  );
  return {
    workspace: encodePublicId('workspace', other),
    savedText: encodePublicId('savedText', id),
  };
}

async function newText(name: string, text = 'Podpis'): Promise<SavedTextDto> {
  const response = await call('POST', 'saved-texts', ownerAuth, { name, doc: doc(text) });
  expect(response.status).toBe(201);
  return (await response.json()) as SavedTextDto;
}

async function listed(auth: Auth = ownerAuth): Promise<SavedTextDto[]> {
  const response = await call('GET', 'saved-texts', auth);
  expect(response.status).toBe(200);
  return ((await response.json()) as { items: SavedTextDto[] }).items;
}

async function auditsOf(savedTextId: string) {
  return await owner.withActor(CLI, (trx) =>
    trx
      .selectFrom('audit_events')
      .select(['action', 'args_summary'])
      .where('resource_kind', '=', 'saved_text')
      .where('resource_id', '=', savedTextId)
      .execute(),
  );
}

describe('saved texts', () => {
  it('creates, lists by name and audits without the text', async () => {
    const zebra = await newText('Zebra', 'Tajný text');
    await newText('  alfa  ');
    expect((await listed()).map((item) => item.name)).toEqual(['alfa', 'Zebra']);
    expect(zebra.doc).toEqual(doc('Tajný text'));
    expect(await listed(viewerAuth)).toHaveLength(2);

    const audits = await auditsOf(decodePublicId('savedText', zebra.id) ?? '');
    expect(audits.map((audit) => audit.action)).toEqual(['saved_text.created']);
    expect(JSON.stringify(audits)).not.toContain('Tajný');
  });

  it('refuses a name that differs only in case, on create and rename', async () => {
    await newText('Duplicate');
    const copy = await call('POST', 'saved-texts', ownerAuth, {
      name: 'DUPLICATE',
      doc: doc('Text'),
    });
    expect(copy.status).toBe(409);
    expect((await errorOf(copy)).code).toBe('saved_text_exists');

    const other = await newText('Unique');
    const renamed = await call('PATCH', `saved-texts/${other.id}`, ownerAuth, {
      name: 'duplicate',
    });
    expect(renamed.status).toBe(409);
  });

  it('refuses invalid names and docs', async () => {
    const cases = [
      [{ name: '   ', doc: doc('Text') }, 'saved_text_name_invalid'],
      [{ name: 'n'.repeat(61), doc: doc('Text') }, 'saved_text_name_invalid'],
      [{ name: 'Blank', doc: doc('   ') }, 'saved_text_invalid'],
      [{ name: 'Long', doc: doc('a'.repeat(2001)) }, 'saved_text_invalid'],
      [
        { name: 'Rich', doc: { type: 'doc', content: [{ type: 'heading' }] } },
        'saved_text_invalid',
      ],
    ] as const;
    for (const [body, code] of cases) {
      const response = await call('POST', 'saved-texts', ownerAuth, body);
      expect(response.status).toBe(422);
      expect((await errorOf(response)).details?.[0]?.code).toBe(code);
    }
  });

  it('refuses a doc of many short lines that stays under the text limit', async () => {
    const lines = Array.from({ length: 1000 }, () => ({
      type: 'paragraph',
      content: [{ type: 'text', text: 'a' }],
    }));
    const response = await call('POST', 'saved-texts', ownerAuth, {
      name: 'Lines',
      doc: { type: 'doc', content: lines },
    });
    expect(response.status).toBe(422);
    expect((await errorOf(response)).details?.[0]?.code).toBe('saved_text_invalid');
  });

  it('updates and deletes', async () => {
    const text = await newText('Editable');
    const patched = await call('PATCH', `saved-texts/${text.id}`, ownerAuth, {
      doc: doc('Nový text'),
    });
    expect(patched.status).toBe(200);
    expect(((await patched.json()) as SavedTextDto).doc).toEqual(doc('Nový text'));

    const removed = await call('DELETE', `saved-texts/${text.id}`, ownerAuth);
    expect(removed.status).toBe(204);
    expect((await listed()).map((item) => item.id)).not.toContain(text.id);
  });

  it('caps a workspace at 100', async () => {
    const present = (await listed()).length;
    await owner.withActor(CLI, (trx) =>
      trx
        .insertInto('saved_texts')
        .values(
          Array.from({ length: 100 - present }, (_, index) => ({
            workspace_id: workspaceId,
            name: `Filler ${index}`,
            doc: JSON.stringify(doc('Text')),
            doc_schema_v: 1,
          })),
        )
        .execute(),
    );
    const response = await call('POST', 'saved-texts', ownerAuth, {
      name: 'One too many',
      doc: doc('Text'),
    });
    expect(response.status).toBe(409);
    expect((await errorOf(response)).code).toBe('saved_text_limit');
  });

  it("can't read or write another workspace's saved texts", async () => {
    expect((await listed()).map((item) => item.name)).not.toContain('Foreign');
    const url = `${BASE}/v1/workspaces/${foreign.workspace}/saved-texts`;
    const read = await requestAs(app, viewerAuth, { method: 'GET', url });
    expect(read.status).toBe(404);
    const write = await call('PATCH', `saved-texts/${foreign.savedText}`, ownerAuth, {
      name: 'Taken',
    });
    expect(write.status).toBe(404);
    const removal = await call('DELETE', `saved-texts/${foreign.savedText}`, ownerAuth);
    expect(removal.status).toBe(404);
  });

  it('needs settings:write to change one, and reading stays open', async () => {
    const [first] = await listed(contributorAuth);
    const body = { name: 'Nope', doc: doc('Text') };
    expect((await call('POST', 'saved-texts', contributorAuth, body)).status).toBe(403);
    expect((await call('POST', 'saved-texts', viewerAuth, body)).status).toBe(403);
    const patch = await call('PATCH', `saved-texts/${first?.id}`, contributorAuth, { name: 'x' });
    expect(patch.status).toBe(403);
    expect((await call('DELETE', `saved-texts/${first?.id}`, contributorAuth)).status).toBe(403);
  });
});
