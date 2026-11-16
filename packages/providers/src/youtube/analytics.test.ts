import { isProviderFailure, type ProviderError } from '@kronaut/core';
import { describe, expect, it } from 'vitest';
import { type ScriptedExchange, scriptedHttp, testBaseContext } from '../_kit/testing.ts';
import { youtubeRuntime } from './runtime.ts';
import { googleError, REFRESH, TOKEN } from './testing.ts';

const CHANNEL_ID = 'UCabcdefghijklmnopqrstuv';
const STATS = 'https://www.googleapis.com/youtube/v3/videos:batchGetStats?part=statistics&id=';
const CHANNELS = 'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true';
const base = {
  app: { clientId: 'client-1', clientSecret: 's', publicBaseUrl: 'https://k.example.org' },
  account: { providerAccountId: CHANNEL_ID },
  credentials: { accessToken: TOKEN, refreshToken: REFRESH },
};

const video = (index: number) => `vid_${String(index).padStart(7, '0')}`;

async function caught(promise: Promise<unknown>): Promise<ProviderError> {
  try {
    await promise;
  } catch (error) {
    if (isProviderFailure(error)) return error.error;
    throw error;
  }
  throw new Error('expected a provider failure');
}

async function analytics(exchanges: readonly ScriptedExchange[], remoteIds: readonly string[]) {
  const http = scriptedHttp(exchanges);
  if (youtubeRuntime.analytics === undefined) throw new Error('youtube reads analytics');
  const result = await youtubeRuntime.analytics(testBaseContext(http), {
    ...base,
    remoteIds,
    postTypes: {},
  });
  http.assertDone();
  return { result, calls: http.calls };
}

function accountMetrics(exchanges: readonly ScriptedExchange[]) {
  const http = scriptedHttp(exchanges);
  if (youtubeRuntime.accountMetrics === undefined) throw new Error('youtube reads followers');
  return youtubeRuntime.accountMetrics(testBaseContext(http), base);
}

describe('youtube analytics', () => {
  it('reads string counts in chunks of 50 with the bearer token', async () => {
    const ids = Array.from({ length: 51 }, (_, index) => video(index));
    const stats = (id: string) => ({
      id,
      statistics: { viewCount: '1200', likeCount: '34', commentCount: '5' },
    });
    const { result, calls } = await analytics(
      [
        {
          url: `${STATS}${ids.slice(0, 50).join(',')}`,
          json: { items: ids.slice(0, 50).map(stats) },
        },
        { url: `${STATS}${ids[50]}`, json: { items: [{ id: ids[50], statistics: {} }] } },
      ],
      [...ids, video(0)],
    );
    expect(calls[0]?.headers).toEqual({ Authorization: `Bearer ${TOKEN}` });
    expect(result.posts[video(3)]).toEqual({ views: 1200, likes: 34, comments: 5 });
    expect(result.posts[video(50)]).toEqual({ views: null, likes: null, comments: null });
    expect(result.failed).toBeUndefined();
    expect(result.apiVersion).toBe('v3');
  });

  it('retries a failed or missing video and refuses an id that is not URL-safe', async () => {
    const { result } = await analytics(
      [
        {
          url: `${STATS}a1,b2,c3`,
          json: {
            items: [{ id: 'a1', statistics: { viewCount: '12x', likeCount: '99999999999999999' } }],
            summary: { failedVideoIds: ['b2'] },
          },
        },
      ],
      ['a1', 'b2', 'c3', 'x/../y'],
    );
    expect(result.posts).toEqual({ a1: { views: null, likes: null, comments: null } });
    expect(result.failed).toEqual({
      b2: { kind: 'transient', detail: 'not_in_response' },
      c3: { kind: 'transient', detail: 'not_in_response' },
      'x/../y': { kind: 'permanent', code: 'remote_id_invalid' },
    });
  });

  it('stops the channel on spent quota or a dead token', async () => {
    const quota = googleError(403, 'quotaExceeded', 'GET', `${STATS}a1`);
    expect(await caught(analytics([quota], ['a1']))).toMatchObject({
      kind: 'rate_limited',
      scope: 'app',
    });
    const dead = { url: `${STATS}a1`, status: 401, json: {} };
    expect(await caught(analytics([dead], ['a1']))).toEqual({ kind: 'auth_expired' });
  });

  it('reads subscribers and the current profile of its own channel', async () => {
    const metrics = await accountMetrics([
      {
        url: CHANNELS,
        json: {
          items: [
            { id: 'UCzzzzzzzzzzzzzzzzzzzzzz', snippet: { title: 'Other' } },
            {
              id: CHANNEL_ID,
              snippet: { title: ' Renamed ', customUrl: '@renamed' },
              statistics: { subscriberCount: '12300', hiddenSubscriberCount: false },
            },
          ],
        },
      },
    ]);
    expect(metrics).toEqual({
      followers: 12_300,
      apiVersion: 'v3',
      profile: {
        displayName: 'Renamed',
        handle: '@renamed',
        profileUrl: `https://www.youtube.com/channel/${CHANNEL_ID}`,
      },
    });
  });

  it('reports a hidden count as unknown and a missing channel as permanent', async () => {
    const hidden = await accountMetrics([
      {
        url: CHANNELS,
        json: {
          items: [
            {
              id: CHANNEL_ID,
              snippet: {},
              statistics: { subscriberCount: '0', hiddenSubscriberCount: true },
            },
          ],
        },
      },
    ]);
    expect(hidden.followers).toBeNull();
    expect(hidden.profile?.displayName).toBe(CHANNEL_ID);
    expect(await caught(accountMetrics([{ url: CHANNELS, json: {} }]))).toEqual({
      kind: 'permanent',
      code: 'channel_missing',
    });
  });
});
