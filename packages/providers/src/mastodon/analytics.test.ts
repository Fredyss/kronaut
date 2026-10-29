import { describe, expect, it } from 'vitest';
import { scriptedHttp, testBaseContext } from '../_kit/testing.ts';
import { mastodonRuntime } from './runtime.ts';
import { failureOf, input, ORIGIN, STATUSES, TOKEN } from './testing.ts';

const { app, account, credentials } = input([]);

function analytics(http: ReturnType<typeof scriptedHttp>, remoteIds: readonly string[]) {
  if (mastodonRuntime.analytics === undefined) throw new Error('mastodon reads analytics');
  return mastodonRuntime.analytics(testBaseContext(http), {
    app,
    account,
    credentials,
    remoteIds,
  });
}

describe('mastodon analytics', () => {
  it('maps the status counters, with quotes only where the server reports them', async () => {
    const http = scriptedHttp([
      {
        url: `${STATUSES}/111`,
        json: {
          id: '111',
          favourites_count: 4,
          reblogs_count: 2,
          replies_count: 1,
          quotes_count: 0,
        },
      },
      { url: `${STATUSES}/222`, json: { id: '222', favourites_count: 7, replies_count: -1 } },
    ]);
    expect(await analytics(http, ['111', '222'])).toEqual({
      posts: {
        '111': { likes: 4, reposts: 2, replies: 1, quotes: 0 },
        '222': { likes: 7, reposts: null, replies: null },
      },
      apiVersion: 'v1',
    });
    http.assertDone();
    expect(http.calls[0]?.headers.authorization).toBe(`Bearer ${TOKEN}`);
  });

  it('fails a deleted or invalid status on its own and stops on a rate limit', async () => {
    const http = scriptedHttp([{ url: `${STATUSES}/111`, status: 404, json: {} }]);
    expect(await analytics(http, ['111', '../x'])).toEqual({
      posts: {},
      failed: {
        '111': { kind: 'permanent', code: 'not_found' },
        '../x': { kind: 'permanent', code: 'remote_id_invalid' },
      },
      apiVersion: 'v1',
    });
    const limited = scriptedHttp([{ url: `${STATUSES}/111`, status: 429 }]);
    expect((await failureOf(analytics(limited, ['111']))).kind).toBe('rate_limited');
    const revoked = scriptedHttp([{ url: `${STATUSES}/111`, status: 401 }]);
    expect(await failureOf(analytics(revoked, ['111']))).toEqual({ kind: 'auth_revoked' });
  });

  it('reads at most 20 statuses per call and leaves the rest unread', async () => {
    const ids = Array.from({ length: 21 }, (_, i) => String(1000 + i));
    const http = scriptedHttp(
      ids.slice(0, 20).map((id) => ({ url: `${STATUSES}/${id}`, json: { id } })),
    );
    const result = await analytics(http, ids);
    http.assertDone();
    expect(Object.keys(result.posts)).toHaveLength(20);
    expect(result.posts['1020']).toBeUndefined();
    expect(result.failed).toBeUndefined();
  });

  it('reads followers from the account, NULL when the field is missing', async () => {
    if (mastodonRuntime.accountMetrics === undefined) throw new Error('mastodon reads followers');
    const url = `${ORIGIN}/api/v1/accounts/verify_credentials`;
    const http = scriptedHttp([
      { url, json: { id: '1', followers_count: 12 } },
      { url, json: { id: '1' } },
    ]);
    const ctx = testBaseContext(http);
    const read = () => mastodonRuntime.accountMetrics?.(ctx, { app, account, credentials });
    expect(await read()).toEqual({ followers: 12, apiVersion: 'v1' });
    expect(await read()).toEqual({ followers: null, apiVersion: 'v1' });
  });
});
