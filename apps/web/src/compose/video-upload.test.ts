import { createApiClient } from '@kronaut/sdk';
import { describe, expect, it } from 'vitest';
import { partRanges, uploadVideo, type VideoJob } from './video-upload.ts';

const BASE = '/v1/workspaces/ws_1/media';

function asset(id: string, patch: Record<string, unknown> = {}) {
  return {
    id,
    kind: 'video',
    mime: 'video/mp4',
    bytes: 10,
    width: 1080,
    height: 1920,
    durationMs: 12_000,
    sha256: null,
    state: 'ready',
    aiGenerated: false,
    rejectedReason: null,
    duplicateOf: null,
    ...patch,
  };
}

interface Seen {
  readonly method: string;
  readonly path: string;
  readonly size: number;
}

type Reply = (seen: Seen, count: number) => Response | undefined;

function fallback({ method, path }: Seen): Response {
  if (method === 'POST' && path === `${BASE}/uploads`) {
    return Response.json(
      {
        media: asset('media_v', { state: 'uploading' }),
        partSize: 4,
        partCount: 3,
        expiresAt: '2026-10-28T08:00:00.000Z',
      },
      { status: 201 },
    );
  }
  if (path.includes('/parts/')) return Response.json({ part: 1, bytes: 4 });
  if (path.endsWith('/complete')) return Response.json(asset('media_v', { state: 'processing' }));
  if (path === `${BASE}/media_v`) return Response.json(asset('media_v'));
  return Response.json({ error: { code: 'not_found', message: '' } }, { status: 404 });
}

function setup(reply: Reply = () => undefined) {
  const seen: Seen[] = [];
  const waits: number[] = [];
  const client = createApiClient({
    baseUrl: 'http://kronaut.test',
    fetch: async (input) => {
      const request = input as Request;
      const call = {
        method: request.method,
        path: new URL(request.url).pathname,
        size: request.method === 'PUT' ? (await request.arrayBuffer()).byteLength : 0,
      };
      seen.push(call);
      return reply(call, seen.filter((s) => s.path === call.path).length) ?? fallback(call);
    },
  });
  const api = {
    client,
    workspaceId: 'ws_1',
    wait: async (ms: number) => {
      waits.push(ms);
    },
  };
  return { api, seen, waits };
}

function job(size: number, signal = new AbortController().signal): VideoJob & { log: string[] } {
  const log: string[] = [];
  return {
    log,
    file: new File([new Uint8Array(size)], 'clip.mp4', { type: 'video/mp4' }),
    aiGenerated: () => false,
    signal,
    onCreated: (media) => log.push(`created ${media.id}`),
    onProgress: (sent, total) => log.push(`${sent}/${total}`),
    onProcessing: () => log.push('processing'),
  };
}

const partPaths = (seen: readonly Seen[]) => seen.filter((s) => s.method === 'PUT');

describe('partRanges', () => {
  it('slices an exact multiple into full parts', () => {
    expect(partRanges(8, 4, 2)).toEqual([
      { start: 0, end: 4 },
      { start: 4, end: 8 },
    ]);
  });

  it('ends with a shorter part for a remainder', () => {
    expect(partRanges(10, 4, 3)).toEqual([
      { start: 0, end: 4 },
      { start: 4, end: 8 },
      { start: 8, end: 10 },
    ]);
  });
});

describe('uploadVideo', () => {
  it('creates, sends the parts in order, completes and polls until ready', async () => {
    const { api, seen, waits } = setup((s, count) =>
      s.path === `${BASE}/media_v` && count === 1
        ? Response.json(asset('media_v', { state: 'processing' }))
        : undefined,
    );
    const run = job(10);
    const outcome = await uploadVideo(api, run);

    expect(outcome).toEqual({ kind: 'ready', asset: asset('media_v') });
    expect(partPaths(seen).map((s) => [s.path.split('/').at(-1), s.size])).toEqual([
      ['1', 4],
      ['2', 4],
      ['3', 2],
    ]);
    expect(seen.at(-3)?.path).toBe(`${BASE}/media_v/complete`);
    expect(waits).toEqual([3000, 3000]);
    expect(run.log).toEqual(['created media_v', '0/10', '4/10', '8/10', '10/10', 'processing']);
  });

  it('retries a failed part with backoff and carries on', async () => {
    const { api, seen, waits } = setup((s, count) => {
      if (!s.path.endsWith('/parts/2') || count > 2) return undefined;
      return Response.json({ error: { code: 'unavailable', message: '' } }, { status: 503 });
    });
    const outcome = await uploadVideo(api, job(10));

    expect(outcome.kind).toBe('ready');
    expect(partPaths(seen).map((s) => s.path.split('/').at(-1))).toEqual(['1', '2', '2', '2', '3']);
    expect(waits.slice(0, 2)).toEqual([1000, 2000]);
  });

  it('gives up once a part has failed after every retry', async () => {
    const { api, seen, waits } = setup((s) =>
      s.path.endsWith('/parts/1')
        ? Response.json({ error: { code: 'internal', message: '' } }, { status: 500 })
        : undefined,
    );

    await expect(uploadVideo(api, job(10))).rejects.toMatchObject({ status: 500 });
    expect(partPaths(seen)).toHaveLength(4);
    expect(waits).toEqual([1000, 2000, 4000]);
    expect(seen.some((s) => s.path.endsWith('/complete'))).toBe(false);
  });

  it('does not retry a part the server refuses', async () => {
    const { api, seen } = setup((s) =>
      s.path.endsWith('/parts/1')
        ? Response.json({ error: { code: 'conflict', message: '' } }, { status: 409 })
        : undefined,
    );

    await expect(uploadVideo(api, job(10))).rejects.toMatchObject({ status: 409 });
    expect(partPaths(seen)).toHaveLength(1);
  });

  it('stops sending parts once aborted', async () => {
    const controller = new AbortController();
    const { api, seen } = setup((s) => {
      if (s.path.endsWith('/parts/1')) controller.abort();
      return undefined;
    });

    await expect(uploadVideo(api, job(10, controller.signal))).rejects.toBeDefined();
    expect(partPaths(seen).length).toBeLessThanOrEqual(1);
    expect(seen.some((s) => s.path.endsWith('/complete'))).toBe(false);
  });

  it('switches to the kept asset when the master duplicates another one', async () => {
    const { api, seen } = setup((s) => {
      if (s.path === `${BASE}/media_v`) {
        return Response.json(
          asset('media_v', {
            state: 'rejected',
            rejectedReason: 'video_duplicate',
            duplicateOf: 'media_kept',
          }),
        );
      }
      if (s.path === `${BASE}/media_kept`) return Response.json(asset('media_kept'));
      return undefined;
    });

    expect(await uploadVideo(api, job(10))).toEqual({
      kind: 'ready',
      asset: asset('media_kept'),
    });
    expect(seen.at(-1)?.path).toBe(`${BASE}/media_kept`);
  });

  it('reports the reason of a rejected video', async () => {
    const { api } = setup((s) =>
      s.path === `${BASE}/media_v`
        ? Response.json(asset('media_v', { state: 'rejected', rejectedReason: 'video_too_short' }))
        : undefined,
    );

    expect(await uploadVideo(api, job(10))).toEqual({
      kind: 'rejected',
      reason: 'video_too_short',
    });
  });
});
