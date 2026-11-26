import { decodePublicId } from '@kronaut/core';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { openWebhookSecrets } from '../../../infrastructure/credentials/webhook-secret.ts';
import { callHooks, type HookFixture, SYSTEM, startHooks, stopHooks } from '../testing.ts';

const CANARY_URL = 'https://hooks.example.test/in?token=CANARY_webhook_url_token';

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

function create(body: Record<string, unknown> = {}, cookie = fixture.cookies.owner) {
  return callHooks(
    fixture,
    { cookie },
    { method: 'POST', body: { url: CANARY_URL, events: ['destination.failed'], ...body } },
  );
}

function internalId(id: unknown): string {
  return decodePublicId('webhookEndpoint', String(id)) ?? '';
}

function sealedRow(endpointId: string) {
  return fixture.root.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('webhook_endpoints')
      .selectAll()
      .where('id', '=', endpointId)
      .executeTakeFirstOrThrow(),
  );
}

function stored(table: 'audit_events' | 'idempotency_keys') {
  return fixture.root.withActor(SYSTEM, async (trx) =>
    JSON.stringify(await trx.selectFrom(table).selectAll().execute()),
  );
}

describe('authorization', () => {
  it('lets owners and admins manage endpoints, nobody else and never an API key', async () => {
    expect(
      (await callHooks(fixture, { cookie: fixture.cookies.admin }, { method: 'GET' })).status,
    ).toBe(200);
    expect((await create({}, fixture.cookies.admin)).status).toBe(201);
    for (const cookie of [fixture.cookies.editor, fixture.cookies.viewer]) {
      expect((await callHooks(fixture, { cookie }, { method: 'GET' })).status).toBe(403);
      expect((await create({}, cookie)).status).toBe(403);
    }
    const keyed = await callHooks(fixture, { bearer: fixture.grantToken }, { method: 'GET' });
    expect(keyed.status).toBe(401);
  });

  it('keeps one workspace out of another (TEN-01)', async () => {
    const { json } = await create();
    const id = String(json?.id);
    const outsider = { cookie: fixture.cookies.outsider };
    const theirs = { workspaceId: fixture.otherWorkspaceId };
    expect((await callHooks(fixture, outsider, { method: 'GET' })).status).toBe(404);
    const own = await callHooks(fixture, outsider, { method: 'GET', ...theirs });
    expect(own.json).toEqual({ items: [] });
    for (const request of [
      { method: 'PATCH', path: `/${id}`, body: { enabled: false } },
      { method: 'POST', path: `/${id}/rotate-secret` },
      { method: 'POST', path: `/${id}/test` },
      { method: 'DELETE', path: `/${id}` },
    ] as const) {
      expect((await callHooks(fixture, outsider, { ...request, ...theirs })).status).toBe(404);
    }
    const after = await callHooks(fixture, { cookie: fixture.cookies.owner }, { method: 'GET' });
    expect(JSON.stringify(after.json)).toContain(id);
  });
});

describe('endpoint lifecycle', () => {
  it('returns the signing secret once, seals it with the workspace in the AAD, and never stores it plain (SEC-04)', async () => {
    const created = await create({ events: ['post.completed', 'destination.failed'] });
    expect(created.status).toBe(201);
    const secret = String(created.json?.secret);
    expect(secret).toMatch(/^whsec_/);
    expect(created.json?.events).toEqual(['destination.failed', 'post.completed']);
    const endpointId = internalId(created.json?.id);
    const row = await sealedRow(endpointId);
    expect(row.secret_ciphertext.toString('latin1')).not.toContain(secret.slice(6));
    const aad = { endpointId, workspaceId: fixture.workspaceId };
    expect(openWebhookSecrets(fixture.keyring, aad, row, true).current).toBe(secret);
    const moved = { endpointId, workspaceId: fixture.otherWorkspaceId };
    expect(() => openWebhookSecrets(fixture.keyring, moved, row, true)).toThrow();

    const listed = await callHooks(fixture, { cookie: fixture.cookies.owner }, { method: 'GET' });
    expect(listed.text).not.toContain(secret);
    expect(listed.text).not.toContain('secret"');
    for (const table of ['audit_events', 'idempotency_keys'] as const) {
      const dump = await stored(table);
      expect(dump).not.toContain(secret);
      expect(dump).not.toContain('CANARY_webhook_url_token');
    }
    expect(fixture.lines.join('\n')).not.toContain(secret);
    expect(fixture.lines.join('\n')).not.toContain('CANARY_webhook_url_token');
  });

  it('rotates with an overlap: the old secret stays as the previous one until it expires', async () => {
    const created = await create();
    const id = String(created.json?.id);
    const endpointId = internalId(id);
    const rotated = await callHooks(
      fixture,
      { cookie: fixture.cookies.owner },
      { method: 'POST', path: `/${id}/rotate-secret` },
    );
    expect(rotated.status).toBe(200);
    expect(rotated.json?.secret).not.toBe(created.json?.secret);
    expect(rotated.json?.previousSecretExpiresAt).not.toBeNull();
    const row = await sealedRow(endpointId);
    const hours = (row.previous_secret_expires_at?.getTime() ?? 0) - Date.now();
    expect(hours / 3_600_000).toBeGreaterThan(23.9);
    const opened = openWebhookSecrets(
      fixture.keyring,
      { endpointId, workspaceId: fixture.workspaceId },
      row,
      true,
    );
    expect(opened).toEqual({ current: rotated.json?.secret, previous: created.json?.secret });
    expect(await stored('audit_events')).not.toContain(String(rotated.json?.secret));
  });

  it('updates, disables, re-enables and deletes, and audits each step by id', async () => {
    const id = String((await create()).json?.id);
    const owner = { cookie: fixture.cookies.owner };
    const patched = await callHooks(fixture, owner, {
      method: 'PATCH',
      path: `/${id}`,
      body: {
        url: 'https://other.example.test/x',
        events: ['post.approved'],
        description: ' Ops ',
      },
    });
    expect(patched.json).toMatchObject({
      url: 'https://other.example.test/x',
      events: ['post.approved'],
      description: 'Ops',
    });
    const off = await callHooks(fixture, owner, {
      method: 'PATCH',
      path: `/${id}`,
      body: { enabled: false },
    });
    expect(off.json).toMatchObject({ enabled: false, disabledReason: 'manual' });
    const tested = await callHooks(fixture, owner, { method: 'POST', path: `/${id}/test` });
    expect(tested.status).toBe(409);
    const on = await callHooks(fixture, owner, {
      method: 'PATCH',
      path: `/${id}`,
      body: { enabled: true },
    });
    expect(on.json).toMatchObject({ enabled: true, disabledReason: null, consecutiveFailures: 0 });
    expect((await callHooks(fixture, owner, { method: 'DELETE', path: `/${id}` })).status).toBe(
      204,
    );
    expect((await callHooks(fixture, owner, { method: 'DELETE', path: `/${id}` })).status).toBe(
      404,
    );
    const actions = await fixture.root.withActor(SYSTEM, (trx) =>
      trx
        .selectFrom('audit_events')
        .select('action')
        .where('resource_id', '=', internalId(id))
        .orderBy('occurred_at')
        .execute(),
    );
    expect(actions.map((row) => row.action)).toEqual([
      'webhook_endpoint.created',
      'webhook_endpoint.updated',
      'webhook_endpoint.updated',
      'webhook_endpoint.updated',
      'webhook_endpoint.deleted',
    ]);
  });

  it('refuses URLs that could never be delivered and events outside the frozen list', async () => {
    for (const url of [
      'http://hooks.example.test/',
      'https://10.0.0.1/',
      'https://hooks.example.test:8080/',
    ]) {
      const refused = await create({ url });
      expect(refused.status).toBe(422);
    }
    for (const events of [[], ['post.approval_voided'], ['webhook.test']]) {
      expect((await create({ events })).status).toBe(400);
    }
  });
});

describe('webhook.test', () => {
  it('queues one test event for that endpoint only, whatever it subscribes to', async () => {
    const id = String((await create({ events: ['channel.expiring'] })).json?.id);
    await create({ events: ['channel.expiring'] });
    const sent = await callHooks(
      fixture,
      { cookie: fixture.cookies.admin },
      { method: 'POST', path: `/${id}/test` },
    );
    expect(sent.status).toBe(202);
    const eventId = String(sent.json?.eventId);
    const deliveries = await fixture.root.withActor(SYSTEM, async (trx) => {
      const event = await trx
        .selectFrom('webhook_events')
        .select(['type', 'payload'])
        .where('id', '=', eventId)
        .executeTakeFirstOrThrow();
      expect(event.type).toBe('webhook.test');
      expect(event.payload).toMatchObject({ id: eventId, type: 'webhook.test', data: {} });
      return await trx
        .selectFrom('webhook_deliveries')
        .select(['endpoint_id', 'state'])
        .where('event_id', '=', eventId)
        .execute();
    });
    expect(deliveries).toEqual([{ endpoint_id: internalId(id), state: 'pending' }]);
  });

  it('allows ten tests per endpoint per hour', async () => {
    const id = String((await create()).json?.id);
    const owner = { cookie: fixture.cookies.owner };
    for (let n = 0; n < 10; n++) {
      expect(
        (await callHooks(fixture, owner, { method: 'POST', path: `/${id}/test` })).status,
      ).toBe(202);
    }
    expect((await callHooks(fixture, owner, { method: 'POST', path: `/${id}/test` })).status).toBe(
      429,
    );
  });
});
