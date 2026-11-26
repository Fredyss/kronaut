import { isProviderFailure, type ProviderError } from '@kronaut/core';
import { describe, expect, it } from 'vitest';
import { type ScriptedExchange, scriptedHttp, testBaseContext } from '../_kit/testing.ts';
import { xRuntime } from './runtime.ts';
import { APP, REFRESH, TOKEN, TWEETS_URL, USER_ID } from './testing.ts';

const LOOKUP = `${TWEETS_URL}?ids=`;
const FIELDS = '&tweet.fields=public_metrics';
const ME = 'https://api.x.com/2/users/me?user.fields=public_metrics';
const PROBLEMS = 'https://api.x.com/2/problems';
const base = {
  app: APP,
  account: { providerAccountId: USER_ID },
  credentials: { accessToken: TOKEN, refreshToken: REFRESH },
};

const post = (index: number) => `18490000000000${String(index).padStart(5, '0')}`;
const counts = {
  like_count: 34,
  retweet_count: 5,
  reply_count: 2,
  quote_count: 1,
  bookmark_count: 3,
  impression_count: 1200,
};

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
  if (xRuntime.analytics === undefined) throw new Error('x reads analytics');
  const result = await xRuntime.analytics(testBaseContext(http), {
    ...base,
    remoteIds,
    postTypes: {},
  });
  http.assertDone();
  return { result, calls: http.calls };
}

function accountMetrics(exchanges: readonly ScriptedExchange[]) {
  const http = scriptedHttp(exchanges);
  if (xRuntime.accountMetrics === undefined) throw new Error('x reads followers');
  return xRuntime.accountMetrics(testBaseContext(http), base);
}

describe('x analytics', () => {
  it('reads public metrics in batches of 100 with the bearer token', async () => {
    const ids = Array.from({ length: 101 }, (_, index) => post(index));
    const { result, calls } = await analytics(
      [
        {
          url: `${LOOKUP}${ids.slice(0, 100).join(',')}${FIELDS}`,
          json: { data: ids.slice(0, 100).map((id) => ({ id, public_metrics: counts })) },
        },
        {
          url: `${LOOKUP}${ids[100]}${FIELDS}`,
          json: { data: [{ id: ids[100], public_metrics: { repost_count: 7, like_count: -1 } }] },
        },
      ],
      [...ids, post(0)],
    );
    expect(calls[0]?.headers).toEqual({ Authorization: `Bearer ${TOKEN}` });
    expect(result.posts[post(3)]).toEqual({
      likes: 34,
      reposts: 5,
      replies: 2,
      quotes: 1,
      bookmarks: 3,
      views: 1200,
    });
    expect(result.posts[post(100)]).toEqual({
      likes: null,
      reposts: 7,
      replies: null,
      quotes: null,
      bookmarks: null,
      views: null,
    });
    expect(result.failed).toBeUndefined();
    expect(result.apiVersion).toBe('2');
  });

  it('ends a deleted or protected post and retries one it could not place', async () => {
    const [gone, hidden, odd, missing] = [post(1), post(2), post(3), post(4)];
    const { result } = await analytics(
      [
        {
          url: `${LOOKUP}${[gone, hidden, odd, missing].join(',')}${FIELDS}`,
          json: {
            errors: [
              { resource_id: gone, type: `${PROBLEMS}/resource-not-found` },
              { value: hidden, type: `${PROBLEMS}/not-authorized-for-resource` },
              { resource_id: odd, type: `${PROBLEMS}/something-new` },
            ],
          },
        },
      ],
      [gone, hidden, odd, missing, '12/../3'],
    );
    expect(result.posts).toEqual({});
    expect(result.failed).toEqual({
      [gone]: { kind: 'permanent', code: 'not_found' },
      [hidden]: { kind: 'permanent', code: 'not_found', detail: 'not-authorized-for-resource' },
      [odd]: { kind: 'transient', detail: 'something-new' },
      [missing]: { kind: 'transient', detail: 'not_in_response' },
      '12/../3': { kind: 'permanent', code: 'remote_id_invalid' },
    });
  });

  it('never ends or purges a post because the whole request failed', async () => {
    const url = `${LOOKUP}${post(1)}${FIELDS}`;
    for (const status of [400, 403, 404]) {
      const { result } = await analytics([{ url, status, json: {} }], [post(1)]);
      expect(result.failed?.[post(1)]?.kind).toBe('transient');
    }
  });

  it('stops the channel on spent credits, a rate limit or a dead token', async () => {
    const url = `${LOOKUP}${post(1)}${FIELDS}`;
    expect(await caught(analytics([{ url, status: 402 }], [post(1)]))).toEqual({
      kind: 'permanent',
      code: 'credits_depleted',
      detail: 'http_402',
    });
    const limited = { url, status: 429, headers: { 'retry-after': '60' } };
    expect(await caught(analytics([limited], [post(1)]))).toMatchObject({
      kind: 'rate_limited',
      scope: 'account',
    });
    expect(await caught(analytics([{ url, status: 401 }], [post(1)]))).toEqual({
      kind: 'auth_expired',
    });
  });

  it('reads the follower count and the current profile of its own account', async () => {
    const metrics = await accountMetrics([
      {
        url: ME,
        json: {
          data: {
            id: USER_ID,
            username: 'ada_dev',
            name: ' Ada ',
            public_metrics: { followers_count: 4200, following_count: 10 },
          },
        },
      },
    ]);
    expect(metrics).toEqual({
      followers: 4200,
      apiVersion: '2',
      profile: { displayName: 'Ada', handle: 'ada_dev', profileUrl: 'https://x.com/ada_dev' },
    });
  });

  it('reports a missing count as unknown and another account as missing', async () => {
    const bare = await accountMetrics([
      { url: ME, json: { data: { id: USER_ID, username: 'ada_dev' } } },
    ]);
    expect(bare.followers).toBeNull();
    const other = { url: ME, json: { data: { id: '42', username: 'someone' } } };
    expect(await caught(accountMetrics([other]))).toEqual({
      kind: 'permanent',
      code: 'channel_missing',
    });
  });
});
