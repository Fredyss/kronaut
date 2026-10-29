import {
  type AccountMetrics,
  type AccountMetricsInput,
  type AnalyticsInput,
  type AnalyticsResult,
  type BaseContext,
  type PostMetrics,
  ProviderFailure,
} from '@kronaut/core';
import * as z from 'zod';
import { countOf, eachPost, NOT_FOUND } from '../_kit/analytics.ts';
import { readJson, send } from '../_kit/http.ts';
import { apiUrl, originOf, permanent } from './api.ts';
import type { MastodonCredentials } from './connect.ts';
import { failureOf, remoteId } from './publish-state.ts';

const API_VERSION = 'v1';
// An instance allows 300 calls per 5 minutes per IP, shared by every account Kronaut reads there.
const MAX_READS = 20;
const entity = z.record(z.string(), z.unknown());

async function readEntity(
  ctx: BaseContext,
  input: AccountMetricsInput<MastodonCredentials>,
  path: string,
): Promise<Readonly<Record<string, unknown>>> {
  const response = await send(ctx, 'none', apiUrl(originOf(input.app), path), {
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${input.credentials.accessToken}`,
    },
  });
  if (response.status === 404) throw new ProviderFailure(NOT_FOUND);
  if (response.status !== 200) throw failureOf(ctx, response, 'none', 'invalid_request');
  return readJson(response, entity, 'none');
}

export function statusMetrics(status: Readonly<Record<string, unknown>>): PostMetrics {
  return {
    likes: countOf(status.favourites_count),
    reposts: countOf(status.reblogs_count),
    replies: countOf(status.replies_count),
    ...(Object.hasOwn(status, 'quotes_count') ? { quotes: countOf(status.quotes_count) } : {}),
  };
}

export async function statusAnalytics(
  ctx: BaseContext,
  input: AnalyticsInput<MastodonCredentials>,
): Promise<AnalyticsResult> {
  const ids = [...new Set(input.remoteIds)];
  const valid = (id: string) => remoteId.safeParse(id).success;
  const reads = [...ids.filter((id) => !valid(id)), ...ids.filter(valid).slice(0, MAX_READS)];
  return eachPost(
    reads,
    async (id) => {
      if (!valid(id)) throw permanent('remote_id_invalid');
      return statusMetrics(await readEntity(ctx, input, `/api/v1/statuses/${id}`));
    },
    API_VERSION,
  );
}

export async function accountMetrics(
  ctx: BaseContext,
  input: AccountMetricsInput<MastodonCredentials>,
): Promise<AccountMetrics> {
  const account = await readEntity(ctx, input, '/api/v1/accounts/verify_credentials');
  return { followers: countOf(account.followers_count), apiVersion: API_VERSION };
}
