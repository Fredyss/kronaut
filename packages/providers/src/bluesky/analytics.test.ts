import { describe, expect, it } from 'vitest';
import { scriptedHttp, testBaseContext } from '../_kit/testing.ts';
import { PUBLIC_APPVIEW } from './analytics.ts';
import type { BlueskyCredentials } from './credentials.ts';
import { blueskyRuntime } from './runtime.ts';
import { AS, CLIENT_ID, DID, failureOf, PDS, TOKEN } from './testing.ts';

const credentials: BlueskyCredentials = {
  did: DID,
  pds: PDS,
  issuer: AS,
  tokenEndpoint: TOKEN,
  accessToken: 'CANARY_access',
  refreshToken: 'CANARY_refresh',
  dpopJwk: { kty: 'EC', crv: 'P-256', x: 'x', y: 'y', d: 'd' },
};
const base = {
  app: { clientId: CLIENT_ID, publicBaseUrl: 'https://kronaut.example.org' },
  account: { providerAccountId: DID },
  credentials,
};
const uri = (rkey: string) => `at://${DID}/app.bsky.feed.post/${rkey}`;
const GET_POSTS = `${PUBLIC_APPVIEW}/xrpc/app.bsky.feed.getPosts?`;

function analytics(http: ReturnType<typeof scriptedHttp>, remoteIds: readonly string[]) {
  if (blueskyRuntime.analytics === undefined) throw new Error('bluesky reads analytics');
  return blueskyRuntime.analytics(testBaseContext(http), { ...base, remoteIds });
}

describe('bluesky analytics', () => {
  it('reads public counts in chunks of 25 without credentials', async () => {
    const rkeys = Array.from({ length: 26 }, (_, i) => `3l${String(i).padStart(11, 'a')}`);
    const views = rkeys.map((rkey, i) => ({
      uri: uri(rkey),
      likeCount: i,
      repostCount: 1,
      replyCount: 2,
      quoteCount: 3,
      bookmarkCount: 4,
    }));
    const http = scriptedHttp([
      { url: new RegExp(`^${GET_POSTS}`), json: { posts: views.slice(0, 25) } },
      { url: new RegExp(`^${GET_POSTS}`), json: { posts: [{ uri: uri(rkeys[25] ?? '') }] } },
    ]);
    const result = await analytics(http, rkeys.map(uri));
    http.assertDone();
    expect(new URL(http.calls[0]?.url ?? '').searchParams.getAll('uris')).toHaveLength(25);
    expect(http.calls[0]?.headers.authorization).toBeUndefined();
    expect(result.posts[uri(rkeys[1] ?? '')]).toEqual({
      likes: 1,
      reposts: 1,
      replies: 2,
      quotes: 3,
      bookmarks: 4,
    });
    expect(result.posts[uri(rkeys[25] ?? '')]).toEqual({
      likes: null,
      reposts: null,
      replies: null,
      quotes: null,
      bookmarks: null,
    });
  });

  it('fails a post missing from the response as not found', async () => {
    const http = scriptedHttp([
      { url: new RegExp(`^${GET_POSTS}`), json: { posts: [{ uri: uri('a'), likeCount: 5 }] } },
    ]);
    const result = await analytics(http, [uri('a'), uri('b'), 'https://example.org/x']);
    expect(result.failed).toEqual({
      [uri('b')]: { kind: 'permanent', code: 'not_found' },
      'https://example.org/x': { kind: 'permanent', code: 'remote_id_invalid' },
    });
    const limited = scriptedHttp([{ url: new RegExp(`^${GET_POSTS}`), status: 429 }]);
    expect((await failureOf(analytics(limited, [uri('a')]))).kind).toBe('rate_limited');
  });

  it('reads followers from the public profile', async () => {
    const http = scriptedHttp([
      {
        url: `${PUBLIC_APPVIEW}/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(DID)}`,
        json: { did: DID, handle: 'alice.example.com', followersCount: 40 },
      },
    ]);
    const metrics = await blueskyRuntime.accountMetrics?.(testBaseContext(http), base);
    expect(metrics?.followers).toBe(40);
  });
});
