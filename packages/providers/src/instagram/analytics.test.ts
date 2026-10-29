import { isProviderFailure, type ProviderError } from '@kronaut/core';
import { describe, expect, it } from 'vitest';
import { type ScriptedExchange, scriptedHttp, testBaseContext } from '../_kit/testing.ts';
import { instagramManifest } from './manifest.ts';
import { instagramRuntime } from './runtime.ts';

const IG_ID = '17841400000000001';
const MEDIA = '18000000000000009';
const GRAPH = 'https://graph.instagram.com/v26.0';
const BASIC = ['instagram_business_basic', 'instagram_business_content_publish'];
const WITH_INSIGHTS = [...BASIC, 'instagram_business_manage_insights'];

function input(scopes: readonly string[], postType = 'image') {
  return {
    app: { clientId: '990011223344', clientSecret: 's', publicBaseUrl: 'https://k.example.org' },
    account: { providerAccountId: IG_ID },
    credentials: {
      userId: IG_ID,
      accessToken: 'ig-token-canary',
      issuedAt: '2026-10-01T00:00:00Z',
      scopes: [...scopes],
    },
    remoteIds: [MEDIA],
    postTypes: { [MEDIA]: postType },
  };
}

function analytics(
  http: ReturnType<typeof scriptedHttp>,
  scopes: readonly string[],
  type?: string,
) {
  if (instagramRuntime.analytics === undefined) throw new Error('instagram reads analytics');
  return instagramRuntime.analytics(testBaseContext(http), input(scopes, type));
}

const counts: ScriptedExchange = {
  url: `${GRAPH}/${MEDIA}?fields=like_count%2Ccomments_count&access_token=ig-token-canary`,
  json: { like_count: 12, comments_count: 3, id: MEDIA },
};

function insights(metric: string, json: unknown, status = 200): ScriptedExchange {
  const query = new URLSearchParams({ metric, access_token: 'ig-token-canary' });
  return { url: `${GRAPH}/${MEDIA}/insights?${query}`, status, json };
}

const lifetime = (name: string, value: number) => ({
  name,
  period: 'lifetime',
  values: [{ value }],
  title: name,
  id: `${MEDIA}/insights/${name}/lifetime`,
});

async function failureOf(promise: Promise<unknown>): Promise<ProviderError> {
  try {
    await promise;
  } catch (error) {
    if (isProviderFailure(error)) return error.error;
    throw error;
  }
  throw new Error('expected a provider failure');
}

describe('instagram analytics', () => {
  it('reads analytics and followers', () => {
    expect(instagramManifest.capabilities.analytics).toBe(true);
    expect(instagramRuntime.accountMetrics).toBeDefined();
  });

  it('reads only likes and comments without the insights scope', async () => {
    const http = scriptedHttp([counts]);
    expect(await analytics(http, BASIC)).toEqual({
      posts: { [MEDIA]: { likes: 12, comments: 3 } },
      apiVersion: 'v26.0',
    });
    http.assertDone();
  });

  it('adds views, reach, saves, shares and reposts with the scope', async () => {
    const http = scriptedHttp([
      counts,
      insights('views,reach,shares,reposts,saved', {
        data: [
          lifetime('views', 400),
          lifetime('reach', 250),
          lifetime('shares', 4),
          lifetime('reposts', 1),
          lifetime('saved', 7),
        ],
      }),
    ]);
    expect((await analytics(http, WITH_INSIGHTS, 'carousel')).posts[MEDIA]).toEqual({
      likes: 12,
      comments: 3,
      views: 400,
      reach: 250,
      shares: 4,
      reposts: 1,
      bookmarks: 7,
    });
    http.assertDone();
  });

  it('asks a story for no saves and stores too few viewers as NULL', async () => {
    const http = scriptedHttp([
      counts,
      insights(
        'views,reach,shares,reposts',
        { error: { message: '(#10) Not enough viewers for the media to show insights', code: 10 } },
        400,
      ),
    ]);
    expect((await analytics(http, WITH_INSIGHTS, 'story')).posts[MEDIA]).toEqual({
      likes: 12,
      comments: 3,
      views: null,
      reach: null,
      shares: null,
      reposts: null,
    });
    http.assertDone();
  });

  it('maps empty insights to NULL, drops them on a 5xx, and keeps stops and failed media reads', async () => {
    const empty = scriptedHttp([
      counts,
      insights('views,reach,shares,reposts,saved', { data: [] }),
    ]);
    expect((await analytics(empty, WITH_INSIGHTS, 'reel')).posts[MEDIA]).toEqual({
      likes: 12,
      comments: 3,
      views: null,
      reach: null,
      shares: null,
      reposts: null,
      bookmarks: null,
    });
    const down = scriptedHttp([counts, insights('views,reach,shares,reposts,saved', {}, 500)]);
    expect((await analytics(down, WITH_INSIGHTS)).posts[MEDIA]).toEqual({ likes: 12, comments: 3 });
    const gone = scriptedHttp([{ ...counts, status: 400, json: { error: { code: 100 } } }]);
    expect((await analytics(gone, WITH_INSIGHTS)).failed?.[MEDIA]).toMatchObject({
      kind: 'permanent',
    });
    const limited = scriptedHttp([
      counts,
      insights('views,reach,shares,reposts,saved', { error: { code: 4 } }, 400),
    ]);
    expect(await failureOf(analytics(limited, WITH_INSIGHTS))).toMatchObject({
      kind: 'rate_limited',
      scope: 'app',
    });
  });

  it('reads the follower count from /me', async () => {
    if (instagramRuntime.accountMetrics === undefined) throw new Error('instagram reads followers');
    const http = scriptedHttp([
      {
        url: `${GRAPH}/me?fields=followers_count&access_token=ig-token-canary`,
        json: { followers_count: 1520, id: IG_ID },
      },
    ]);
    expect(await instagramRuntime.accountMetrics(testBaseContext(http), input(BASIC))).toEqual({
      followers: 1520,
      apiVersion: 'v26.0',
    });
  });
});
