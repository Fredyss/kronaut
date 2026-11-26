import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { callHooks, type HookFixture, SYSTEM, startHooks, stopHooks } from '../testing.ts';

const CANARY_URL = 'https://hooks.example.test/in?token=CANARY_delivery_url_token';

let test: TestDatabase;
let fixture: HookFixture;

beforeAll(async () => {
  test = await startTestDatabase();
  fixture = await startHooks(test);
});

afterAll(async () => {
  await stopHooks(fixture);
  await test?.stop();
});

const owner = () => ({ cookie: fixture.cookies.owner });

async function endpointWithTests(count: number): Promise<{ id: string; secret: string }> {
  const created = await callHooks(fixture, owner(), {
    method: 'POST',
    body: { url: CANARY_URL, events: ['destination.failed'] },
  });
  const id = String(created.json?.id);
  for (let n = 0; n < count; n++) {
    await callHooks(fixture, owner(), { method: 'POST', path: `/${id}/test` });
  }
  return { id, secret: String(created.json?.secret) };
}

function deliveries(id: string, query = '', auth: { cookie: string } = owner()) {
  return callHooks(fixture, auth, { method: 'GET', path: `/${id}/deliveries${query}` });
}

describe('webhooks.deliveries', () => {
  it('pages newest first by cursor', async () => {
    const { id } = await endpointWithTests(3);
    const first = await deliveries(id, '?limit=2');
    expect(first.status).toBe(200);
    const items = first.json?.items as Record<string, unknown>[];
    expect(items).toHaveLength(2);
    expect(String(items[0]?.id) > String(items[1]?.id)).toBe(true);
    expect(items[0]).toMatchObject({
      eventType: 'webhook.test',
      state: 'pending',
      attemptCount: 0,
      lastHttpStatus: null,
      lastError: null,
    });
    expect(items[0]?.nextAttemptAt).not.toBeNull();
    const cursor = String(first.json?.nextCursor);
    const second = await deliveries(id, `?limit=2&cursor=${cursor}`);
    expect(second.json?.items).toHaveLength(1);
    expect(second.json?.nextCursor).toBeNull();
    const all = await deliveries(id);
    expect(all.json?.items).toHaveLength(3);
  });

  it('shows only the endpoint asked for and clears nextAttemptAt once a delivery is over', async () => {
    const { id } = await endpointWithTests(1);
    const other = await endpointWithTests(2);
    await callHooks(fixture, owner(), {
      method: 'PATCH',
      path: `/${id}`,
      body: { enabled: false },
    });
    const listed = await deliveries(id);
    expect(listed.json?.items).toEqual([
      expect.objectContaining({
        state: 'dead',
        lastError: 'endpoint_disabled',
        nextAttemptAt: null,
      }),
    ]);
    expect((await deliveries(other.id)).json?.items).toHaveLength(2);
  });

  it('refuses a bad cursor or limit with 422', async () => {
    const { id } = await endpointWithTests(0);
    for (const query of ['?cursor=whk_nope', '?limit=0', '?limit=101', '?limit=x', '?kind=a']) {
      expect((await deliveries(id, query)).status).toBe(422);
    }
  });

  it('is for owners and admins only, signed in', async () => {
    const { id } = await endpointWithTests(0);
    expect((await deliveries(id, '', { cookie: fixture.cookies.admin })).status).toBe(200);
    for (const cookie of [fixture.cookies.editor, fixture.cookies.viewer]) {
      expect((await deliveries(id, '', { cookie })).status).toBe(403);
    }
    const keyed = await callHooks(
      fixture,
      { bearer: fixture.grantToken },
      { method: 'GET', path: `/${id}/deliveries` },
    );
    expect(keyed.status).toBe(401);
  });

  it('keeps one workspace out of another (TEN-01)', async () => {
    const { id } = await endpointWithTests(1);
    const outsider = { cookie: fixture.cookies.outsider };
    expect((await deliveries(id, '', outsider)).status).toBe(404);
    const theirs = await callHooks(fixture, outsider, {
      method: 'GET',
      path: `/${id}/deliveries`,
      workspaceId: fixture.otherWorkspaceId,
    });
    expect(theirs.status).toBe(404);
  });

  it('never returns the URL, the payload or a secret (SEC-04)', async () => {
    const { id, secret } = await endpointWithTests(1);
    const listed = await deliveries(id);
    const items = listed.json?.items as Record<string, unknown>[];
    const eventId = String(items[0]?.eventId);
    const payload = await fixture.root.withActor(SYSTEM, (trx) =>
      trx
        .selectFrom('webhook_events')
        .select('payload')
        .where('id', '=', eventId)
        .executeTakeFirstOrThrow(),
    );
    expect(payload.payload).toMatchObject({ id: eventId });
    expect(listed.text).not.toContain('CANARY_delivery_url_token');
    expect(listed.text).not.toContain('hooks.example.test');
    expect(listed.text).not.toContain(secret);
    expect(listed.text).not.toContain('"payload"');
    expect(listed.text).not.toContain('"data"');
    expect(listed.text).not.toContain(fixture.workspaceId);
  });
});
