import { decodePublicId } from '@kronaut/core';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import { EgressError } from '@kronaut/egress';
import { sql } from 'kysely';
import { pino } from 'pino';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import {
  accountA,
  CLI,
  call,
  grantAuth,
  owner,
  ownerAuth,
  SYSTEM,
  startPosts,
  stopPosts,
  viewerAuth,
} from '../../flow/posts/testing.ts';
import { shortenerServer } from './testing.ts';

const KEY = 'dub_CANARY_shortener_9b2e41';
const NEW_KEY = 'kutt_CANARY_rotated_5d1c07';
const logs: string[] = [];
const logger = pino({ level: 'debug' }, { write: (line: string) => logs.push(line) });
const server = shortenerServer();
const bodies: string[] = [];
let test: TestDatabase;

beforeAll(async () => {
  test = await startTestDatabase();
  await startPosts(test, logger, undefined, server);
});

afterAll(async () => {
  await stopPosts();
  await test?.stop();
});

afterEach(async () => {
  server.reset();
  await owner.withActor(CLI, (trx) => trx.deleteFrom('link_shorteners').execute());
});

async function shortenerCall(method: 'GET' | 'POST' | 'PATCH' | 'DELETE', body?: unknown) {
  const response = await call(method, 'link-shortener', ownerAuth, body);
  const text = await response.text();
  bodies.push(text);
  return { status: response.status, json: text === '' ? null : JSON.parse(text) };
}

function detailCode(json: { error?: { details?: { code: string }[] } } | null) {
  return json?.error?.details?.[0]?.code;
}

function audits() {
  return owner.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('audit_events')
      .select(['action', 'resource_kind', 'args_summary'])
      .where('action', 'like', 'link_shortener.%')
      .orderBy('occurred_at')
      .orderBy('id')
      .execute(),
  );
}

function storedRows() {
  return owner.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('link_shorteners')
      .select(['provider', 'base_url', 'domain', 'key_ciphertext'])
      .execute(),
  );
}

describe('connecting a shortener', () => {
  it('checks the key, seals it and returns only hasKey', async () => {
    server.reply({ body: [] });
    const created = await shortenerCall('POST', { provider: 'dub', apiKey: KEY });
    expect(created.status).toBe(201);
    expect(created.json).toMatchObject({
      provider: 'dub',
      baseUrl: 'https://api.dub.co',
      domain: null,
      hasKey: true,
    });
    expect(server.calls).toEqual([
      expect.objectContaining({ method: 'GET', url: 'https://api.dub.co/links?pageSize=1' }),
    ]);
    expect(server.calls[0]?.headers.authorization).toBe(`Bearer ${KEY}`);
    const [row] = await storedRows();
    expect(row?.key_ciphertext.toString('utf8')).not.toContain(KEY);
    expect((await shortenerCall('GET')).json).toEqual({ shortener: created.json });

    server.reply({ body: [] });
    expect((await shortenerCall('POST', { provider: 'dub', apiKey: KEY })).status).toBe(409);
  });

  it('refuses a key the shortener refuses, and a host it cannot reach', async () => {
    server.reply({ status: 401, body: { error: { code: 'unauthorized' } } });
    const refused = await shortenerCall('POST', { provider: 'dub', apiKey: KEY });
    expect(refused.status).toBe(422);
    expect(detailCode(refused.json)).toBe('shortener_unauthorized');

    server.reply({ error: new EgressError('dns_failure', `links.example.test ${KEY}`) });
    const unreachable = await shortenerCall('POST', {
      provider: 'kutt',
      baseUrl: 'https://links.example.test',
      apiKey: KEY,
    });
    expect(unreachable.status).toBe(422);
    expect(detailCode(unreachable.json)).toBe('shortener_unreachable');
    expect(await storedRows()).toEqual([]);
  });

  it('stores a Kutt base URL without /api/v2 and refuses kutt.it before any call', async () => {
    const phishing = await shortenerCall('POST', {
      provider: 'kutt',
      baseUrl: 'https://kutt.it',
      apiKey: KEY,
    });
    expect(detailCode(phishing.json)).toBe('base_url_invalid');
    expect(server.calls).toEqual([]);

    server.reply({ body: { apikey: KEY } });
    const created = await shortenerCall('POST', {
      provider: 'kutt',
      baseUrl: 'https://links.example.test/api/v2/',
      domain: 'Go.Example.Test',
      apiKey: KEY,
    });
    expect(created.json).toMatchObject({
      baseUrl: 'https://links.example.test',
      domain: 'go.example.test',
    });
    expect(server.calls[0]?.url).toBe('https://links.example.test/api/v2/users');
  });

  it('is for owners and admins in a session only', async () => {
    const body = { provider: 'dub', apiKey: KEY };
    expect((await call('POST', 'link-shortener', viewerAuth, body)).status).toBe(403);
    expect((await call('GET', 'link-shortener', grantAuth)).status).toBe(401);
    expect(server.calls).toEqual([]);
  });
});

describe('changing and removing the shortener', () => {
  it('checks the stored key on a change and a new key when one is given', async () => {
    server.reply({ body: { apikey: KEY } });
    await shortenerCall('POST', { provider: 'kutt', baseUrl: 'https://kutt.to', apiKey: KEY });

    server.reply({ body: {} });
    const domain = await shortenerCall('PATCH', { domain: 'go.example.test' });
    expect(domain.json).toMatchObject({ domain: 'go.example.test', hasKey: true });
    expect(server.calls[1]?.headers['x-api-key']).toBe(KEY);

    server.reply({ body: {} });
    await shortenerCall('PATCH', { apiKey: NEW_KEY });
    expect(server.calls[2]?.headers['x-api-key']).toBe(NEW_KEY);

    server.reply({ status: 403 });
    const refused = await shortenerCall('PATCH', { apiKey: KEY });
    expect(detailCode(refused.json)).toBe('shortener_unauthorized');

    expect((await shortenerCall('DELETE')).status).toBe(204);
    expect((await shortenerCall('GET')).json).toEqual({ shortener: null });
    expect((await shortenerCall('DELETE')).status).toBe(404);
    expect((await shortenerCall('PATCH', { domain: null })).status).toBe(404);

    const events = (await audits()).slice(-4);
    expect(events.map((event) => event.action)).toEqual([
      'link_shortener.connected',
      'link_shortener.updated',
      'link_shortener.updated',
      'link_shortener.removed',
    ]);
    expect(events[1]?.args_summary).toEqual({ base_url: false, domain: true, api_key: false });
    expect(events[2]?.args_summary).toEqual({ base_url: false, domain: false, api_key: true });
  });
});

describe('the channel switch', () => {
  it('turns shortening off per channel, shows it in the list and audits it', async () => {
    const path = `channels/${accountA}/shorten-links`;
    const off = await call('PUT', path, ownerAuth, { shortenLinks: false });
    expect(await off.json()).toEqual({ shortenLinks: false });
    const list = (await (await call('GET', 'channels', ownerAuth)).json()) as {
      items: { id: string; shortenLinks: boolean }[];
    };
    expect(list.items.find((item) => item.id === accountA)?.shortenLinks).toBe(false);
    expect((await call('PUT', path, viewerAuth, { shortenLinks: true })).status).toBe(403);
    expect((await call('PUT', path, ownerAuth, { shortenLinks: true })).status).toBe(200);

    const events = await owner.withActor(SYSTEM, (trx) =>
      trx
        .selectFrom('audit_events')
        .select('args_summary')
        .where('action', '=', 'channel.shorten_links_updated')
        .where('resource_id', '=', decodePublicId('socialAccount', accountA) ?? '')
        .orderBy('occurred_at')
        .execute(),
    );
    expect(events.map((event) => event.args_summary)).toEqual([
      { shorten_links: false },
      { shorten_links: true },
    ]);
  });
});

describe('SEC-03 shortener_key_secret', () => {
  it('never puts the key in a response, a log, an audit event or a job payload', async () => {
    server.reply({ body: [] });
    await shortenerCall('POST', { provider: 'dub', apiKey: KEY });
    server.reply({ status: 401 });
    await shortenerCall('PATCH', { apiKey: NEW_KEY });
    const audit = await owner.withActor(SYSTEM, (trx) =>
      sql<{ text: string }>`select coalesce(string_agg(t::text, ' '), '') as text
        from audit_events t`.execute(trx),
    );
    const jobs = await owner.withActor(CLI, (trx) =>
      sql<{ text: string }>`select coalesce(string_agg(payload::text, ' '), '') as text
        from graphile_worker._private_jobs`.execute(trx),
    );
    const seen = [...bodies, ...logs, audit.rows[0]?.text ?? '', jobs.rows[0]?.text ?? ''];
    for (const text of seen) {
      expect(text).not.toContain(KEY);
      expect(text).not.toContain(NEW_KEY);
    }
  });
});
