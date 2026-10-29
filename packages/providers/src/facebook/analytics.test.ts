import { isProviderFailure, type ProviderError } from '@kronaut/core';
import { describe, expect, it } from 'vitest';
import { scriptedHttp, testBaseContext } from '../_kit/testing.ts';
import { facebookRuntime } from './runtime.ts';

const PAGE = '1000000000001';
const POST = `${PAGE}_2000000000002`;
const base = {
  app: { clientId: '1', clientSecret: 'facebook-secret', publicBaseUrl: 'https://k.example.org' },
  account: { providerAccountId: PAGE },
  credentials: { accessToken: 'CANARY_page_token' },
};
const POST_URL = new RegExp(`^https://graph\\.facebook\\.com/v26\\.0/${POST}\\?fields=shares`);

const INSIGHTS_URL = new RegExp(
  `^https://graph\\.facebook\\.com/v26\\.0/${POST}/insights\\?metric=post_media_view%2Cpost_total_media_view_unique&period=lifetime&`,
);

function analytics(
  http: ReturnType<typeof scriptedHttp>,
  remoteIds: readonly string[],
  scopes?: readonly string[],
) {
  if (facebookRuntime.analytics === undefined) throw new Error('facebook reads analytics');
  const credentials = {
    ...base.credentials,
    ...(scopes === undefined ? {} : { scopes: [...scopes] }),
  };
  return facebookRuntime.analytics(testBaseContext(http), {
    ...base,
    credentials,
    remoteIds,
    postTypes: {},
  });
}

const counted = {
  url: POST_URL,
  json: { id: POST, shares: { count: 1 }, reactions: { data: [], summary: { total_count: 2 } } },
};

async function failureOf(promise: Promise<unknown>): Promise<ProviderError> {
  try {
    await promise;
  } catch (error) {
    if (isProviderFailure(error)) return error.error;
    throw error;
  }
  throw new Error('expected a provider failure');
}

describe('facebook analytics', () => {
  it('maps shares, reactions and comments, and a missing shares field to NULL', async () => {
    const http = scriptedHttp([
      {
        url: POST_URL,
        json: {
          id: POST,
          shares: { count: 3 },
          reactions: { data: [], summary: { total_count: 9 } },
          comments: { data: [], summary: { total_count: 2 } },
        },
      },
      { url: POST_URL, json: { id: POST, reactions: { data: [], summary: { total_count: 0 } } } },
    ]);
    expect((await analytics(http, [POST])).posts[POST]).toEqual({
      shares: 3,
      reactions: 9,
      comments: 2,
    });
    expect(await analytics(http, [POST])).toEqual({
      posts: { [POST]: { shares: null, reactions: 0, comments: null } },
      apiVersion: 'v26.0',
    });
    http.assertDone();
    const url = new URL(http.calls[0]?.url ?? '');
    expect(url.searchParams.get('access_token')).toBe('CANARY_page_token');
    expect(url.searchParams.get('appsecret_proof')).toMatch(/^[0-9a-f]{64}$/);
  });

  it('adds views and reach with read_insights, a missing metric as NULL', async () => {
    const http = scriptedHttp([
      counted,
      {
        url: INSIGHTS_URL,
        json: {
          data: [
            {
              name: 'post_media_view',
              period: 'lifetime',
              values: [{ value: 120 }],
              id: `${POST}/insights/post_media_view/lifetime`,
            },
          ],
          paging: {},
        },
      },
    ]);
    expect((await analytics(http, [POST], ['read_insights'])).posts[POST]).toEqual({
      shares: 1,
      reactions: 2,
      comments: null,
      views: 120,
      reach: null,
    });
    http.assertDone();
    expect(new URL(http.calls[1]?.url ?? '').searchParams.get('appsecret_proof')).toMatch(
      /^[0-9a-f]{64}$/,
    );
  });

  it('keeps the public counts when insights are refused or not granted', async () => {
    const refused = scriptedHttp([
      counted,
      { url: INSIGHTS_URL, status: 400, json: { error: { code: 10, type: 'OAuthException' } } },
    ]);
    expect((await analytics(refused, [POST], ['read_insights'])).posts[POST]).toEqual({
      shares: 1,
      reactions: 2,
      comments: null,
      views: null,
      reach: null,
    });
    const invalid = scriptedHttp([
      counted,
      { url: INSIGHTS_URL, status: 400, json: { error: { code: 100, type: 'OAuthException' } } },
    ]);
    expect(await analytics(invalid, [POST], ['read_insights'])).toEqual({
      posts: { [POST]: { shares: 1, reactions: 2, comments: null, views: null, reach: null } },
      apiVersion: 'v26.0',
    });
    invalid.assertDone();
    const without = scriptedHttp([counted]);
    expect((await analytics(without, [POST], ['pages_read_engagement'])).posts[POST]).toEqual({
      shares: 1,
      reactions: 2,
      comments: null,
    });
    without.assertDone();
  });

  it('fails a deleted post or a reel on its own and stops on a dead token', async () => {
    const http = scriptedHttp([
      { url: POST_URL, status: 400, json: { error: { code: 100, error_subcode: 33 } } },
    ]);
    const result = await analytics(http, [POST, '3000000000003']);
    expect(result.failed?.[POST]).toMatchObject({ kind: 'permanent' });
    expect(result.failed?.['3000000000003']).toEqual({
      kind: 'permanent',
      code: 'remote_id_unsupported',
    });
    const revoked = scriptedHttp([
      { url: POST_URL, status: 400, json: { error: { code: 190, type: 'OAuthException' } } },
    ]);
    expect(await failureOf(analytics(revoked, [POST]))).toEqual({ kind: 'auth_revoked' });
  });

  it('reads no follower count', () => {
    expect(facebookRuntime.accountMetrics).toBeUndefined();
  });
});
