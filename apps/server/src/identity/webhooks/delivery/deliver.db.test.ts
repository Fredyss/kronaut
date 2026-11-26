import { randomUUID } from 'node:crypto';
import { decodePublicId } from '@kronaut/core';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import { EgressError, type EgressResponse, type HttpClient } from '@kronaut/egress';
import { sql } from 'kysely';
import { Temporal } from 'temporal-polyfill';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { channelExpiringEvent, writeWebhookEvent } from '../events.ts';
import { callHooks, type HookFixture, SYSTEM, startHooks, stopHooks } from '../testing.ts';
import { claimDelivery } from './claim.ts';
import { type DeliveryDeps, deliverWebhooks } from './deliver.ts';
import { finishDelivery } from './finish.ts';
import { MAX_ATTEMPTS } from './schedule.ts';
import { signatureOf } from './sign.ts';

interface Seen {
  readonly url: string;
  readonly headers: Record<string, string>;
  readonly body: string;
}

const NOW = Temporal.Instant.from('2026-11-26T10:00:00Z');
const seen: Seen[] = [];
const replies = new Map<string, (number | Error)[]>();

const http: HttpClient = {
  async request(url, init) {
    seen.push({ url: String(url), headers: init?.headers ?? {}, body: String(init?.body) });
    const reply = replies.get(String(url))?.shift() ?? 200;
    if (reply instanceof Error) throw reply;
    const unread = (): never => {
      throw new Error('unread');
    };
    const response: EgressResponse = {
      status: reply,
      headers: new Headers(),
      url: String(url),
      redirected: false,
      bytes: unread,
      text: unread,
      json: unread,
      chunks: unread,
      discard: () => {},
    };
    return response;
  },
  fetch: () => Promise.reject(new Error('not used')),
};

let test: TestDatabase;
let fixture: HookFixture;
let deps: DeliveryDeps;

beforeAll(async () => {
  test = await startTestDatabase();
  fixture = await startHooks(test);
  deps = { db: fixture.db, keyring: fixture.keyring, http, logger: fixture.logger, now: () => NOW };
});

afterAll(async () => {
  await stopHooks(fixture);
  await test?.stop();
});

beforeEach(() => {
  seen.length = 0;
  replies.clear();
});

function reply(target: { readonly url: string }, ...answers: (number | Error)[]): void {
  replies.set(target.url, [...(replies.get(target.url) ?? []), ...answers]);
}

interface Endpoint {
  readonly id: string;
  readonly endpointId: string;
  readonly url: string;
  readonly secret: string;
}

async function endpoint(path: string, events = ['post.approved']): Promise<Endpoint> {
  const url = `https://hooks.example.test/${path}?token=CANARY_delivery_url`;
  const created = await callHooks(
    fixture,
    { cookie: fixture.cookies.owner },
    { method: 'POST', body: { url, events } },
  );
  expect(created.status).toBe(201);
  const id = String(created.json?.id);
  const endpointId = decodePublicId('webhookEndpoint', id) ?? '';
  return { id, endpointId, url, secret: String(created.json?.secret) };
}

async function testEvent(target: Endpoint): Promise<string> {
  const sent = await callHooks(
    fixture,
    { cookie: fixture.cookies.owner },
    { method: 'POST', path: `/${target.id}/test` },
  );
  expect(sent.status).toBe(202);
  return String(sent.json?.eventId);
}

function delivery(eventId: string) {
  return fixture.root.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('webhook_deliveries')
      .select([
        'id',
        'state',
        'attempt_count',
        'last_http_status',
        'last_error',
        'response_snippet',
        sql<number>`extract(epoch from next_attempt_at - now())::integer`.as('wait'),
      ])
      .where('event_id', '=', eventId)
      .executeTakeFirstOrThrow(),
  );
}

function makeDue(eventId: string) {
  return fixture.root.withActor(SYSTEM, (trx) =>
    trx
      .updateTable('webhook_deliveries')
      .set({ next_attempt_at: sql<Date>`now() - interval '1 second'` })
      .where('event_id', '=', eventId)
      .execute(),
  );
}

function endpointRow(endpointId: string) {
  return fixture.root.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('webhook_endpoints')
      .select(['enabled', 'disabled_reason', 'consecutive_failures', 'failing_since'])
      .where('id', '=', endpointId)
      .executeTakeFirstOrThrow(),
  );
}

function to(target: Endpoint): Seen[] {
  return seen.filter((call) => call.url === target.url);
}

function verifies(secret: string, call: Seen): boolean {
  const message = {
    id: call.headers['webhook-id'] ?? '',
    timestamp: Number(call.headers['webhook-timestamp']),
    body: call.body,
  };
  return (call.headers['webhook-signature'] ?? '')
    .split(' ')
    .includes(signatureOf(secret, message));
}

describe('delivery', () => {
  it('posts the stored envelope, signed per Standard Webhooks, and records the status only', async () => {
    const target = await endpoint('signed');
    const eventId = await testEvent(target);
    await deliverWebhooks(deps);
    const [call] = to(target);
    expect(call?.headers).toMatchObject({
      'webhook-id': eventId,
      'webhook-timestamp': String(NOW.epochMilliseconds / 1000),
      'content-type': 'application/json',
    });
    expect(JSON.parse(call?.body ?? '')).toMatchObject({ id: eventId, type: 'webhook.test' });
    expect(call !== undefined && verifies(target.secret, call)).toBe(true);
    expect(await delivery(eventId)).toMatchObject({
      state: 'delivered',
      attempt_count: 1,
      last_http_status: 200,
      last_error: null,
      response_snippet: null,
    });
  });

  it('fans a subscribed event out and retries with backoff, resending the same id and bytes (webhook_resend_same_id)', async () => {
    const target = await endpoint('retry', ['channel.expiring']);
    const eventId = await fixture.db.withTenant(fixture.workspaceId, SYSTEM, async (trx) => {
      const event = channelExpiringEvent(fixture.workspaceId, randomUUID(), {
        social_account_id: randomUUID(),
        provider: 'fake',
        expires_at: '2026-12-01T00:00:00Z',
      });
      await writeWebhookEvent(trx, event);
      const row = await trx
        .selectFrom('webhook_events')
        .select('id')
        .where('dedupe_key', '=', event.dedupeKey)
        .executeTakeFirstOrThrow();
      return row.id;
    });
    reply(target, 503);
    await deliverWebhooks(deps);
    const failed = await delivery(eventId);
    expect(failed).toMatchObject({ state: 'retry_wait', attempt_count: 1, last_http_status: 503 });
    expect(failed.last_error).toBe('http_status');
    expect(failed.wait).toBeGreaterThan(50);
    expect(failed.wait).toBeLessThanOrEqual(60);
    expect((await endpointRow(target.endpointId)).consecutive_failures).toBe(1);

    await makeDue(eventId);
    await deliverWebhooks(deps);
    expect(await delivery(eventId)).toMatchObject({ state: 'delivered', attempt_count: 2 });
    const [first, second] = to(target);
    expect(second?.headers['webhook-id']).toBe(first?.headers['webhook-id']);
    expect(second?.body).toBe(first?.body);
    expect(await endpointRow(target.endpointId)).toMatchObject({
      consecutive_failures: 0,
      failing_since: null,
    });
  });

  it(`gives up after ${MAX_ATTEMPTS} attempts`, async () => {
    const target = await endpoint('dead');
    const eventId = await testEvent(target);
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      reply(target, new EgressError('timeout', `timed out on ${target.url}`));
      await makeDue(eventId);
      await deliverWebhooks(deps);
    }
    expect(await delivery(eventId)).toMatchObject({
      state: 'dead',
      attempt_count: MAX_ATTEMPTS,
      last_http_status: null,
      last_error: 'timeout',
    });
    await makeDue(eventId);
    await deliverWebhooks(deps);
    expect(to(target)).toHaveLength(MAX_ATTEMPTS);
  });

  it('signs with the new and the previous secret during the rotation overlap', async () => {
    const target = await endpoint('rotated');
    const rotated = await callHooks(
      fixture,
      { cookie: fixture.cookies.owner },
      { method: 'POST', path: `/${target.id}/rotate-secret` },
    );
    await testEvent(target);
    await deliverWebhooks(deps);
    const [call] = to(target);
    expect(call?.headers['webhook-signature']?.split(' ')).toHaveLength(2);
    expect(call !== undefined && verifies(String(rotated.json?.secret), call)).toBe(true);
    expect(call !== undefined && verifies(target.secret, call)).toBe(true);

    await fixture.root.withActor(SYSTEM, (trx) =>
      trx
        .updateTable('webhook_endpoints')
        .set({ previous_secret_expires_at: sql<Date>`now() - interval '1 second'` })
        .where('id', '=', target.endpointId)
        .execute(),
    );
    await testEvent(target);
    await deliverWebhooks(deps);
    const last = to(target).at(-1);
    expect(last?.headers['webhook-signature']?.split(' ')).toHaveLength(1);
    expect(last !== undefined && verifies(target.secret, last)).toBe(false);
  });

  it('disables an endpoint that has failed for 5 days and ends its waiting deliveries', async () => {
    const target = await endpoint('failing');
    const first = await testEvent(target);
    const second = await testEvent(target);
    await fixture.root.withActor(SYSTEM, async (trx) => {
      await trx
        .updateTable('webhook_endpoints')
        .set({ failing_since: sql<Date>`now() - interval '6 days'`, consecutive_failures: 40 })
        .where('id', '=', target.endpointId)
        .execute();
      await trx
        .updateTable('webhook_deliveries')
        .set({ next_attempt_at: sql<Date>`now() + interval '1 hour'` })
        .where('event_id', '=', second)
        .execute();
    });
    reply(target, 500);
    await deliverWebhooks(deps);
    expect(await endpointRow(target.endpointId)).toMatchObject({
      enabled: false,
      disabled_reason: 'failing',
    });
    await makeDue(second);
    await deliverWebhooks(deps);
    for (const event of [first, second]) {
      expect(await delivery(event)).toMatchObject({
        state: 'dead',
        last_error: 'endpoint_disabled',
      });
    }
    await makeDue(second);
    await deliverWebhooks(deps);
    expect(to(target)).toHaveLength(1);
    const audit = await fixture.root.withActor(SYSTEM, (trx) =>
      trx
        .selectFrom('audit_events')
        .select(['actor_kind', 'surface'])
        .where('action', '=', 'webhook_endpoint.auto_disabled')
        .where('resource_id', '=', target.endpointId)
        .execute(),
    );
    expect(audit).toEqual([{ actor_kind: 'system', surface: 'worker' }]);
  });
});

describe('claim', () => {
  it('holds a claimed delivery for its lease, then hands it over and fences the stale claim out', async () => {
    const target = await endpoint('lease');
    const eventId = await testEvent(target);
    const { id } = await delivery(eventId);
    const stale = await claimDelivery(fixture.db, { workspaceId: fixture.workspaceId, id });
    expect(stale?.attempt).toBe(1);
    expect(await claimDelivery(fixture.db, { workspaceId: fixture.workspaceId, id })).toBeNull();
    await deliverWebhooks(deps);
    expect(to(target)).toHaveLength(0);

    await makeDue(eventId);
    await deliverWebhooks(deps);
    expect(await delivery(eventId)).toMatchObject({ state: 'delivered', attempt_count: 2 });
    if (stale === null) throw new Error('expected a claim');
    expect(
      await finishDelivery(deps, stale, { ok: false, status: 500, error: 'http_status' }),
    ).toBe('stale');
    expect(await delivery(eventId)).toMatchObject({ state: 'delivered' });
  });

  it('sends nothing while publishing is paused', async () => {
    const target = await endpoint('paused');
    const eventId = await testEvent(target);
    const pause = (paused: boolean) =>
      fixture.root.withActor(SYSTEM, (trx) =>
        paused
          ? sql`insert into instance_state (instance_id, publishing_paused, paused_reason)
                values (gen_random_uuid(), true, 'operator')
                on conflict (singleton) do update set publishing_paused = true, paused_reason = 'operator'`.execute(
              trx,
            )
          : sql`update instance_state set publishing_paused = false, paused_reason = null`.execute(
              trx,
            ),
      );
    await pause(true);
    try {
      await deliverWebhooks(deps);
      const { id } = await delivery(eventId);
      expect(await claimDelivery(fixture.db, { workspaceId: fixture.workspaceId, id })).toBeNull();
    } finally {
      await pause(false);
    }
    expect(to(target)).toHaveLength(0);
    expect(await delivery(eventId)).toMatchObject({ state: 'pending', attempt_count: 0 });
  });

  it('keeps the URL token and egress messages out of rows and logs (SEC-04)', async () => {
    const target = await endpoint('canary');
    const eventId = await testEvent(target);
    reply(
      target,
      new EgressError('blocked_address', `${target.url} resolves to a private address`),
    );
    await deliverWebhooks(deps);
    expect(await delivery(eventId)).toMatchObject({ last_error: 'blocked_address' });
    const rows = await fixture.root.withActor(SYSTEM, async (trx) =>
      JSON.stringify([
        await trx.selectFrom('webhook_deliveries').selectAll().execute(),
        await trx.selectFrom('webhook_events').selectAll().execute(),
        await trx.selectFrom('audit_events').selectAll().execute(),
      ]),
    );
    expect(rows).not.toContain('CANARY');
    expect(fixture.lines.join('\n')).not.toContain('CANARY');
    expect(fixture.lines.join('\n')).not.toContain(target.secret);
  });
});
