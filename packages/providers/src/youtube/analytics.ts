import type {
  AccountMetrics,
  AccountMetricsInput,
  AnalyticsInput,
  AnalyticsResult,
  BaseContext,
} from '@kronaut/core';
import * as z from 'zod';
import { PostResults } from '../_kit/analytics.ts';
import { readJson, send } from '../_kit/http.ts';
import { permanent } from '../_kit/meta-graph.ts';
import { channelProfile, listChannels } from './channel.ts';
import { isSuccess, youtubeFailure } from './errors.ts';
import { youtubeManifest } from './manifest.ts';
import type { YoutubeCredentials } from './oauth.ts';

const STATS_URL = 'https://www.googleapis.com/youtube/v3/videos:batchGetStats';
const CHUNK = 50;
const API_VERSION = youtubeManifest.apiVersion.version;
const VIDEO_ID = /^[A-Za-z0-9_-]{1,64}$/;
const DIGITS = /^\d{1,16}$/;
// A video can be briefly missing or listed as failed while it processes, so neither proves it gone; the attempt cap ends it.
const NOT_IN_RESPONSE = { kind: 'transient', detail: 'not_in_response' } as const;

const stats = z.looseObject({
  items: z
    .array(
      z.looseObject({
        id: z.string(),
        statistics: z
          .looseObject({
            viewCount: z.unknown().optional(),
            likeCount: z.unknown().optional(),
            commentCount: z.unknown().optional(),
          })
          .optional(),
      }),
    )
    .optional(),
  summary: z.looseObject({ failedVideoIds: z.array(z.string()).optional() }).optional(),
});

function countOf(value: unknown): number | null {
  if (typeof value !== 'string' || !DIGITS.test(value)) return null;
  const count = Number(value);
  return Number.isSafeInteger(count) ? count : null;
}

async function readChunk(
  ctx: BaseContext,
  input: AnalyticsInput<YoutubeCredentials>,
  ids: readonly string[],
  results: PostResults,
): Promise<void> {
  const url = `${STATS_URL}?part=statistics&id=${ids.join(',')}`;
  try {
    const response = await send(ctx, 'none', url, {
      headers: { Authorization: `Bearer ${input.credentials.accessToken}` },
    });
    if (!isSuccess(response.status)) throw await youtubeFailure(response, 'none', ctx.now());
    const { items, summary } = await readJson(response, stats, 'none');
    const failed = new Set(summary?.failedVideoIds ?? []);
    const byId = new Map((items ?? []).map((item) => [item.id, item.statistics]));
    for (const id of ids) {
      const statistics = byId.get(id);
      if (failed.has(id) || !byId.has(id)) results.fail(id, NOT_IN_RESPONSE);
      else
        results.ok(id, {
          views: countOf(statistics?.viewCount),
          likes: countOf(statistics?.likeCount),
          comments: countOf(statistics?.commentCount),
        });
    }
  } catch (error) {
    results.catch(ids, error);
  }
}

export async function videoAnalytics(
  ctx: BaseContext,
  input: AnalyticsInput<YoutubeCredentials>,
): Promise<AnalyticsResult> {
  const results = new PostResults();
  const ids: string[] = [];
  for (const id of new Set(input.remoteIds)) {
    if (VIDEO_ID.test(id)) ids.push(id);
    else results.fail(id, { kind: 'permanent', code: 'remote_id_invalid' });
  }
  for (let start = 0; start < ids.length; start += CHUNK) {
    await readChunk(ctx, input, ids.slice(start, start + CHUNK), results);
  }
  return results.result(API_VERSION);
}

export async function channelMetrics(
  ctx: BaseContext,
  input: AccountMetricsInput<YoutubeCredentials>,
): Promise<AccountMetrics> {
  const channels = await listChannels(ctx, input.credentials.accessToken, 'snippet,statistics');
  const channel = channels.find(({ id }) => id === input.account.providerAccountId);
  if (channel === undefined) throw permanent('channel_missing');
  const { statistics } = channel;
  const hidden = statistics?.hiddenSubscriberCount === true;
  return {
    followers: hidden ? null : countOf(statistics?.subscriberCount),
    apiVersion: API_VERSION,
    profile: channelProfile(channel),
  };
}
