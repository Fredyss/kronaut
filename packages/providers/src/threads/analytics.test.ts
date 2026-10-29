import { isProviderFailure } from '@kronaut/core';
import { describe, expect, it } from 'vitest';
import { type ScriptedExchange, scriptedHttp, testBaseContext } from '../_kit/testing.ts';
import { threadsManifest } from './manifest.ts';
import { threadsRuntime } from './runtime.ts';

const USER_ID = '1234567';
const MEDIA = '18000000000000042';
const GRAPH = 'https://graph.threads.com/v1.0';
const BASIC = ['threads_basic', 'threads_content_publish', 'threads_manage_replies'];
const WITH_INSIGHTS = [...BASIC, 'threads_manage_insights'];

function input(scopes: readonly string[]) {
  return {
    app: {
      clientId: '1122334455667788',
      clientSecret: 's',
      publicBaseUrl: 'https://k.example.org',
    },
    account: { providerAccountId: USER_ID },
    credentials: {
      userId: USER_ID,
      accessToken: 'th-token-canary',
      issuedAt: '2026-10-01T00:00:00Z',
      scopes: [...scopes],
    },
    remoteIds: [MEDIA],
    postTypes: { [MEDIA]: 'post' },
  };
}

function read(path: string, metric: string, json: unknown, status = 200): ScriptedExchange {
  const query = new URLSearchParams({ metric, access_token: 'th-token-canary' });
  return { url: `${GRAPH}/${path}?${query}`, status, json };
}

function readers() {
  const { analytics, accountMetrics } = threadsRuntime;
  if (analytics === undefined || accountMetrics === undefined) throw new Error('threads reads');
  return { analytics, accountMetrics };
}

const METRICS = 'views,likes,replies,reposts,quotes,shares';

async function kindOf(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    if (isProviderFailure(error)) return error.error.kind;
    throw error;
  }
  throw new Error('expected a provider failure');
}

describe('threads analytics', () => {
  it('ends the pulls without the insights scope and reads no followers', async () => {
    const http = scriptedHttp([]);
    const { analytics, accountMetrics } = readers();
    expect(threadsManifest.capabilities.analytics).toBe(true);
    expect(await analytics(testBaseContext(http), input(BASIC))).toEqual({
      posts: {},
      failed: { [MEDIA]: { kind: 'permanent', code: 'insights_not_granted' } },
      apiVersion: 'v1.0',
    });
    expect(await accountMetrics(testBaseContext(http), input(BASIC))).toEqual({
      followers: null,
      apiVersion: 'v1.0',
    });
    expect(http.calls).toHaveLength(0);
  });

  it('maps media insights, a missing metric to NULL', async () => {
    const value = (name: string, v: number) => ({
      name,
      period: 'lifetime',
      values: [{ value: v }],
    });
    const http = scriptedHttp([
      read(`${MEDIA}/insights`, METRICS, {
        data: [value('views', 90), value('likes', 8), value('replies', 2), value('reposts', 1)],
      }),
    ]);
    expect((await readers().analytics(testBaseContext(http), input(WITH_INSIGHTS))).posts).toEqual({
      [MEDIA]: { views: 90, likes: 8, replies: 2, reposts: 1, quotes: null, shares: null },
    });
    http.assertDone();
  });

  it('gives NULL insights on a permission error and reads followers from total_value', async () => {
    const http = scriptedHttp([
      read(`${MEDIA}/insights`, METRICS, { error: { code: 200 } }, 403),
      read(`${USER_ID}/threads_insights`, 'followers_count', {
        data: [{ name: 'followers_count', total_value: { value: 812 }, id: `${USER_ID}/x` }],
      }),
    ]);
    const { analytics, accountMetrics } = readers();
    expect((await analytics(testBaseContext(http), input(WITH_INSIGHTS))).posts[MEDIA]).toEqual({
      views: null,
      likes: null,
      replies: null,
      reposts: null,
      quotes: null,
      shares: null,
    });
    expect(await accountMetrics(testBaseContext(http), input(WITH_INSIGHTS))).toEqual({
      followers: 812,
      apiVersion: 'v1.0',
    });
    http.assertDone();
  });

  it('fails a post on a 5xx or a deleted post, and followers on a 5xx', async () => {
    const http = scriptedHttp([
      read(`${MEDIA}/insights`, METRICS, {}, 500),
      read(`${MEDIA}/insights`, METRICS, { error: { code: 100, error_subcode: 33 } }, 400),
      read(`${USER_ID}/threads_insights`, 'followers_count', {}, 500),
    ]);
    const { analytics, accountMetrics } = readers();
    const ctx = testBaseContext(http);
    expect((await analytics(ctx, input(WITH_INSIGHTS))).failed?.[MEDIA]).toMatchObject({
      kind: 'transient',
    });
    expect((await analytics(ctx, input(WITH_INSIGHTS))).failed?.[MEDIA]).toMatchObject({
      kind: 'permanent',
    });
    expect(await kindOf(accountMetrics(ctx, input(WITH_INSIGHTS)))).toBe('transient');
    http.assertDone();
  });
});
