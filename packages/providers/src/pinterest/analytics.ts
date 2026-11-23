import {
  type AccountMetrics,
  type AccountMetricsInput,
  type AnalyticsInput,
  type AnalyticsResult,
  type BaseContext,
  type PostMetric,
  ProviderFailure,
} from '@kronaut/core';
import type { Temporal } from 'temporal-polyfill';
import * as z from 'zod';
import { countOf, eachPost, NOT_FOUND } from '../_kit/analytics.ts';
import { readJson, send } from '../_kit/http.ts';
import { permanent } from '../_kit/meta-graph.ts';
import { accountProfile, pinterestId, readUserAccount } from './boards.ts';
import { isSuccess, pinterestFailure } from './errors.ts';
import { pinterestManifest } from './manifest.ts';
import { API_BASE, type PinterestCredentials } from './oauth.ts';

const API_VERSION = pinterestManifest.apiVersion.version;
// The API looks back at most 90 days; pulls stop at 30 days, so this summary covers a Pin's whole life.
const LOOKBACK_DAYS = 89;

const METRICS: Readonly<Record<string, PostMetric>> = {
  IMPRESSION: 'views',
  SAVE: 'saves',
  OUTBOUND_CLICK: 'link_clicks',
  TOTAL_COMMENTS: 'comments',
  TOTAL_REACTIONS: 'reactions',
};

const metricValues = z.record(z.string(), z.unknown());
const pinMetrics = z.looseObject({
  lifetime_metrics: metricValues.nullish(),
  summary_metrics: metricValues.nullish(),
});
type PinMetrics = z.infer<typeof pinMetrics>;
const pinAnalyticsResponse = z.record(z.string(), pinMetrics);

function analyticsUrl(pinId: string, now: Temporal.Instant): URL {
  const today = now.toZonedDateTimeISO('UTC').toPlainDate();
  const url = new URL(`${API_BASE}/pins/${pinId}/analytics`);
  url.searchParams.set('start_date', today.subtract({ days: LOOKBACK_DAYS }).toString());
  url.searchParams.set('end_date', today.toString());
  url.searchParams.set('metric_types', Object.keys(METRICS).join(','));
  return url;
}

function metricsOf({ lifetime_metrics, summary_metrics }: PinMetrics) {
  const lifetime = lifetime_metrics ?? {};
  const summary = summary_metrics ?? {};
  const metrics: Partial<Record<PostMetric, number | null>> = {};
  for (const [type, metric] of Object.entries(METRICS)) {
    metrics[metric] = countOf(lifetime[type]) ?? countOf(summary[type]);
  }
  return metrics;
}

async function readPin(ctx: BaseContext, token: string, pinId: string) {
  if (!pinterestId.safeParse(pinId).success) throw permanent('remote_id_invalid');
  const response = await send(ctx, 'none', analyticsUrl(pinId, ctx.now()), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (response.status === 404) throw new ProviderFailure(NOT_FOUND);
  if (!isSuccess(response.status))
    throw await pinterestFailure(response, { effect: 'none', now: ctx.now() });
  const groups = await readJson(response, pinAnalyticsResponse, 'none');
  return metricsOf(groups.all ?? Object.values(groups)[0] ?? {});
}

export function pinAnalytics(
  ctx: BaseContext,
  input: AnalyticsInput<PinterestCredentials>,
): Promise<AnalyticsResult> {
  return eachPost(
    input.remoteIds,
    (pinId) => readPin(ctx, input.credentials.accessToken, pinId),
    API_VERSION,
  );
}

export async function accountMetrics(
  ctx: BaseContext,
  input: AccountMetricsInput<PinterestCredentials>,
): Promise<AccountMetrics> {
  const user = await readUserAccount(ctx, input.credentials.accessToken);
  return {
    followers: countOf(user.follower_count),
    apiVersion: API_VERSION,
    profile: accountProfile(user),
  };
}
