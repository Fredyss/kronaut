import { decodePublicId } from '@kronaut/core';
import type { EgressResponse, HttpClient } from '@kronaut/egress';
import { sql } from 'kysely';
import { expect } from 'vitest';
import {
  type Auth,
  CLI,
  call,
  createUser,
  login,
  owner,
  ownerAuth,
  SYSTEM,
  TZ,
  workspaceId,
} from '../../flow/posts/testing.ts';

export const FEED_URL = 'https://blog.example.test/feed.xml';

export interface FeedReply {
  readonly status?: number;
  readonly body?: string;
  readonly headers?: Readonly<Record<string, string>>;
  readonly error?: Error;
  readonly before?: () => Promise<void>;
}

export interface SeenRequest {
  readonly url: string;
  readonly headers: Readonly<Record<string, string>>;
}

export interface FeedServer extends HttpClient {
  readonly requests: SeenRequest[];
  reply(...replies: readonly FeedReply[]): void;
  reset(): void;
}

function response(url: string, reply: FeedReply): EgressResponse {
  const bytes = new TextEncoder().encode(reply.body ?? '');
  return {
    status: reply.status ?? 200,
    headers: new Headers(reply.headers ?? {}),
    url,
    redirected: false,
    bytes: async () => bytes,
    text: async () => reply.body ?? '',
    json: async () => JSON.parse(reply.body ?? 'null'),
    async *chunks() {
      yield bytes;
    },
    discard() {},
  };
}

export function feedServer(): FeedServer {
  const pending: FeedReply[] = [];
  const server: FeedServer = {
    requests: [],
    reply(...replies) {
      pending.push(...replies);
    },
    reset() {
      pending.length = 0;
      server.requests.length = 0;
    },
    async request(url, init) {
      server.requests.push({ url: String(url), headers: { ...init?.headers } });
      const reply = pending.shift();
      if (reply === undefined) throw new Error('no reply is scripted');
      await reply.before?.();
      if (reply.error !== undefined) throw reply.error;
      return response(String(url), reply);
    },
    fetch: () => Promise.reject(new Error('feeds must use request')),
  };
  return server;
}

export interface Entry {
  readonly title?: string;
  readonly link?: string;
  readonly guid?: string;
  readonly date?: string;
  readonly description?: string;
  readonly image?: string;
}

function entryXml(entry: Entry): string {
  return [
    '<item>',
    entry.title === undefined ? '' : `<title>${entry.title}</title>`,
    entry.link === undefined ? '' : `<link>${entry.link}</link>`,
    entry.guid === undefined ? '' : `<guid>${entry.guid}</guid>`,
    entry.date === undefined ? '' : `<pubDate>${entry.date}</pubDate>`,
    entry.description === undefined ? '' : `<description>${entry.description}</description>`,
    entry.image === undefined ? '' : `<enclosure url="${entry.image}" type="image/jpeg"/>`,
    '</item>',
  ].join('');
}

export function rssOf(entries: readonly Entry[]): string {
  return `<?xml version="1.0"?><rss version="2.0"><channel><title>Blog</title>${entries.map(entryXml).join('')}</channel></rss>`;
}

export function entries(prefix: string, count: number): Entry[] {
  return Array.from({ length: count }, (_, n) => ({
    title: `${prefix} ${n}`,
    link: `https://blog.example.test/${prefix}/${n}`,
    date: new Date(Date.UTC(2026, 11, 1 + n)).toUTCString(),
  }));
}

export interface FeedBody {
  readonly url?: string;
  readonly name?: string;
  readonly channelIds?: readonly string[];
  readonly mode?: 'queue' | 'draft';
  readonly template?: string;
  readonly paused?: boolean;
}

export function feedCall(method: 'POST' | 'GET' | 'PATCH' | 'DELETE', path = '', body?: unknown) {
  return call(method, `rss-feeds${path}`, ownerAuth, body);
}

export async function createdFeed(body: FeedBody, auth: Auth = ownerAuth) {
  const response = await call('POST', 'rss-feeds', auth, { url: FEED_URL, name: 'Blog', ...body });
  expect(response.status).toBe(201);
  return (await response.json()) as { id: string; state: string; pausedReason: string | null };
}

export async function queueSlots(channel: string, slots: readonly (readonly [number, string])[]) {
  const response = await call('PUT', `channels/${channel}/queue`, ownerAuth, {
    timezone: TZ,
    slots: slots.map(([weekday, time]) => ({ weekday, time })),
  });
  expect(response.status).toBe(200);
}

export async function addAdmin(label: string) {
  const id = await createUser(label);
  await owner.withActor(CLI, (trx) =>
    trx
      .insertInto('memberships')
      .values({ workspace_id: workspaceId, user_id: id, role: 'admin' })
      .execute(),
  );
  return { id, auth: await login(label) };
}

export function feedId(publicId: string): string {
  const id = decodePublicId('rssFeed', publicId);
  if (id === null) throw new Error(`not a feed id: ${publicId}`);
  return id;
}

export function feedRow(publicId: string) {
  return owner.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('rss_feeds')
      .select(['url', 'state', 'paused_reason', 'last_error', 'failing_since', 'owner_user_id'])
      .select(['etag', 'last_modified', 'last_checked_at'])
      .where('id', '=', feedId(publicId))
      .executeTakeFirstOrThrow(),
  );
}

export function itemRows(publicId: string) {
  return owner.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('rss_items')
      .select(['outcome', 'error_code', 'attempts', 'post_id', 'last_seen_at', 'key'])
      .where('feed_id', '=', feedId(publicId))
      .orderBy('created_at')
      .orderBy('key')
      .execute(),
  );
}

export function feedAudit(publicId: string) {
  return owner.withActor(SYSTEM, (trx) =>
    trx
      .selectFrom('audit_events')
      .select(['action', 'actor_kind', 'args_summary'])
      .where('resource_id', '=', feedId(publicId))
      .orderBy('occurred_at')
      .orderBy('id')
      .execute(),
  );
}

export async function clearFeeds(): Promise<void> {
  await owner.withActor(CLI, async (trx) => {
    await trx.deleteFrom('rss_feeds').execute();
    await sql`delete from graphile_worker._private_jobs`.execute(trx);
  });
}
