import { describe, expect, it } from 'vitest';
import { type ScriptedExchange, scriptedHttp, testBaseContext } from '../_kit/testing.ts';
import { pinterestRuntime } from './runtime.ts';
import { APP, PIN_ID, PINS_URL, pinterestError, TOKEN } from './testing.ts';

const QUERY =
  'start_date=2026-07-24&end_date=2026-10-21&metric_types=IMPRESSION%2CSAVE%2COUTBOUND_CLICK%2CTOTAL_COMMENTS%2CTOTAL_REACTIONS';
const OTHER_PIN = '813744226420795885';
const base = {
  app: APP,
  account: { providerAccountId: '1100000000000001', handle: 'ada_makes' },
  credentials: { accessToken: TOKEN, refreshToken: 'pinr-refresh' },
};

const pinUrl = (pinId: string) => `${PINS_URL}/${pinId}/analytics?${QUERY}`;

async function analytics(exchanges: readonly ScriptedExchange[], remoteIds: readonly string[]) {
  const http = scriptedHttp(exchanges);
  if (pinterestRuntime.analytics === undefined) throw new Error('pinterest reads analytics');
  const result = await pinterestRuntime.analytics(testBaseContext(http), {
    ...base,
    remoteIds,
    postTypes: {},
  });
  http.assertDone();
  return { result, calls: http.calls };
}

describe('pinterest analytics', () => {
  it('maps lifetime metrics and falls back to the 90-day summary, never inventing zeros', async () => {
    const { result, calls } = await analytics(
      [
        {
          url: pinUrl(PIN_ID),
          json: {
            all: {
              lifetime_metrics: {
                IMPRESSION: 1200,
                SAVE: 34,
                OUTBOUND_CLICK: 7,
                TOTAL_COMMENTS: 2,
              },
              summary_metrics: { TOTAL_REACTIONS: 5, IMPRESSION: 9 },
              daily_metrics: [],
            },
          },
        },
        {
          url: pinUrl(OTHER_PIN),
          json: { all: { summary_metrics: { IMPRESSION: 40, SAVE: 1.5 } } },
        },
      ],
      [PIN_ID, OTHER_PIN, PIN_ID],
    );
    expect(calls[0]?.headers).toEqual({ Authorization: `Bearer ${TOKEN}` });
    expect(result.posts[PIN_ID]).toEqual({
      views: 1200,
      saves: 34,
      link_clicks: 7,
      comments: 2,
      reactions: 5,
    });
    expect(result.posts[OTHER_PIN]).toEqual({
      views: 40,
      saves: null,
      link_clicks: null,
      comments: null,
      reactions: null,
    });
    expect(result.failed).toBeUndefined();
    expect(result.apiVersion).toBe('v5');
  });

  it('ends a deleted Pin with not_found and refuses an id that is not digits', async () => {
    const { result, calls } = await analytics(
      [{ url: pinUrl(PIN_ID), ...pinterestError(404, 50, 'Pin not found') }],
      [PIN_ID, '../user_account'],
    );
    expect(calls).toHaveLength(1);
    expect(result.posts).toEqual({});
    expect(result.failed).toEqual({
      [PIN_ID]: { kind: 'permanent', code: 'not_found' },
      '../user_account': expect.objectContaining({ kind: 'permanent', code: 'remote_id_invalid' }),
    });
  });

  it('stops the channel on a rate limit', async () => {
    const http = scriptedHttp([
      {
        url: pinUrl(PIN_ID),
        ...pinterestError(429, 8),
        headers: { 'x-ratelimit-reset': '30' },
      },
    ]);
    const read = pinterestRuntime.analytics?.(testBaseContext(http), {
      ...base,
      remoteIds: [PIN_ID, OTHER_PIN],
      postTypes: {},
    });
    await expect(read).rejects.toMatchObject({ error: { kind: 'rate_limited' } });
  });
});

describe('pinterest account metrics', () => {
  it('reads the follower count and the profile from the user account', async () => {
    const http = scriptedHttp([
      {
        url: 'https://api.pinterest.com/v5/user_account',
        json: {
          id: '1100000000000001',
          username: 'ada_makes',
          business_name: ' ',
          follower_count: 321,
        },
      },
    ]);
    if (pinterestRuntime.accountMetrics === undefined) throw new Error('pinterest reads followers');
    const metrics = await pinterestRuntime.accountMetrics(testBaseContext(http), base);
    http.assertDone();
    expect(metrics).toEqual({
      followers: 321,
      apiVersion: 'v5',
      profile: {
        displayName: 'ada_makes',
        handle: 'ada_makes',
        profileUrl: 'https://www.pinterest.com/ada_makes/',
      },
    });
  });
});
