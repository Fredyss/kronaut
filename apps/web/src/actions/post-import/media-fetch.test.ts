import { createApiClient } from '@kronaut/sdk';
import { describe, expect, it } from 'vitest';
import { fetchAll, fetchLink, type MediaResult } from './media-fetch.ts';

const BASE = '/v1/workspaces/ws_1/media';
const LINK = 'https://cdn.a.test/clip.mp4';

function media(id: string, kind: string, state: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    kind,
    mime: kind === 'video' ? 'video/mp4' : 'image/jpeg',
    bytes: 1000,
    width: null,
    height: null,
    durationMs: null,
    frameRate: null,
    sha256: null,
    state,
    aiGenerated: false,
    altText: null,
    createdAt: '2026-11-01T08:00:00.000Z',
    rejectedReason: null,
    duplicateOf: null,
    ...extra,
  };
}

type Replies = Record<string, readonly unknown[]>;

function setup(replies: Replies) {
  const seen: string[] = [];
  const waits: number[] = [];
  const client = createApiClient({
    baseUrl: 'http://kronaut.test',
    fetch: async (input) => {
      const request = input as Request;
      const path = new URL(request.url).pathname;
      const count = seen.filter((p) => p === path).length;
      seen.push(path);
      const list = replies[path] ?? [];
      const body = list[Math.min(count, list.length - 1)];
      if (body === undefined)
        return Response.json({ error: { code: 'not_found' } }, { status: 404 });
      if (body instanceof Response) return body.clone();
      return Response.json(body, { status: path === `${BASE}/imports` ? 202 : 200 });
    },
  });
  const api = { client, workspaceId: 'ws_1', wait: async (ms: number) => void waits.push(ms) };
  return { api, seen, waits };
}

const job = (state: string, item: unknown = null, error: string | null = null) => ({
  id: 'mimp_1',
  state,
  error,
  media: item,
});

const signal = new AbortController().signal;

describe('fetchLink', () => {
  it('polls the import, then a processing video, every two seconds', async () => {
    const { api, waits } = setup({
      [`${BASE}/imports`]: [job('pending')],
      [`${BASE}/imports/mimp_1`]: [
        job('fetching'),
        job('done', media('m_v', 'video', 'processing')),
      ],
      [`${BASE}/m_v`]: [media('m_v', 'video', 'processing'), media('m_v', 'video', 'ready')],
    });
    expect(await fetchLink(api, LINK, 'key', signal)).toEqual({
      kind: 'ready',
      asset: { id: 'm_v', kind: 'video', mime: 'video/mp4', bytes: 1000 },
    });
    expect(waits).toEqual([2000, 2000, 2000, 2000]);
  });

  it('uses the kept asset for a duplicate video', async () => {
    const duplicate = media('m_v', 'video', 'rejected', {
      rejectedReason: 'video_duplicate',
      duplicateOf: 'm_kept',
    });
    const { api } = setup({
      [`${BASE}/imports`]: [job('done', duplicate)],
      [`${BASE}/m_kept`]: [media('m_kept', 'video', 'ready')],
    });
    expect(await fetchLink(api, LINK, 'key', signal)).toMatchObject({
      kind: 'ready',
      asset: { id: 'm_kept' },
    });
  });

  it('reports a failed import, a refused video and a refused link', async () => {
    const failed = setup({ [`${BASE}/imports`]: [job('failed', null, 'fetch_failed')] });
    expect(await fetchLink(failed.api, LINK, 'key', signal)).toEqual({ kind: 'failed' });
    const refused = setup({
      [`${BASE}/imports`]: [job('done', media('m_v', 'video', 'rejected'))],
    });
    expect(await fetchLink(refused.api, LINK, 'key', signal)).toEqual({ kind: 'rejected' });
    expect(await fetchLink(setup({}).api, LINK, 'key', signal)).toEqual({ kind: 'failed' });
  });
});

describe('fetchAll', () => {
  it('stops at a 429 and keeps only the links fetched before it', async () => {
    const limited = Response.json(
      { error: { code: 'rate_limited', message: 'Too many imports.' } },
      { status: 429 },
    );
    const { api, seen, waits } = setup({
      [`${BASE}/imports`]: [job('done', media('m_1', 'image', 'ready')), limited],
    });
    const urls = ['https://a.test/1.jpg', 'https://a.test/2.jpg', 'https://a.test/3.jpg'];
    const store = new Map<string, MediaResult>();
    const run = { api, urls, keys: new Map<string, string>(), store, signal };
    expect(await fetchAll(run, () => {})).toBe(true);
    expect([...store.keys()]).toEqual(['https://a.test/1.jpg']);
    expect(seen).toEqual([`${BASE}/imports`, `${BASE}/imports`]);
    expect(waits).toEqual([]);
  });
});
