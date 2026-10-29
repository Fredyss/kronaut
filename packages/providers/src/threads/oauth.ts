import { type BaseContext, ProviderFailure } from '@kronaut/core';
import * as z from 'zod';
import { readJson, send } from '../_kit/http.ts';
import { graphGet, permanent } from '../_kit/meta-graph.ts';
import { INSIGHTS_SCOPE, REPLIES_SCOPE } from './capabilities.ts';

export const AUTHORIZE_URL = 'https://threads.com/oauth/authorize';
export const GRAPH_ORIGIN = 'https://graph.threads.com';
const TOKEN_PATH = '/oauth/access_token';
export const GRAPH_VERSION = 'v1.0';
export const SCOPES = [
  'threads_basic',
  'threads_content_publish',
  REPLIES_SCOPE,
  INSIGHTS_SCOPE,
] as const;
export const PROFILE_FIELDS = 'id,username,name,threads_profile_picture_url';

const WITHOUT_INSIGHTS = SCOPES.filter((scope) => scope !== INSIGHTS_SCOPE);

const debugToken = z.looseObject({
  data: z.looseObject({ is_valid: z.boolean(), scopes: z.array(z.string()) }),
});

const shortLivedToken = z.looseObject({ access_token: z.string().min(1) });

export const profile = z.looseObject({
  id: z.string().regex(/^\d{1,32}$/),
  username: z.string().min(1),
  name: z.string().nullish(),
});

export function threadsUrl(path: string, query: Readonly<Record<string, string>> = {}): URL {
  const url = new URL(path, GRAPH_ORIGIN);
  for (const [name, value] of Object.entries(query)) url.searchParams.set(name, value);
  return url;
}

export async function shortLivedAccessToken(
  ctx: BaseContext,
  form: Readonly<Record<string, string>>,
): Promise<string> {
  const response = await send(ctx, 'private', threadsUrl(TOKEN_PATH), {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(form).toString(),
  });
  const { status } = response;
  if (status === 429 || status >= 500)
    throw new ProviderFailure({ kind: 'transient', detail: `http_${status}` });
  if (status !== 200) throw permanent('code_exchange_failed');
  const token = await readJson(response, shortLivedToken, 'private');
  return token.access_token;
}

export interface ThreadsApp {
  readonly clientId: string;
  readonly secret: string;
}

// The code exchange doesn't say which permissions were granted; a failed check must not fail the connect, so it counts as no insights.
export async function grantedScopes(
  ctx: BaseContext,
  app: ThreadsApp,
  token: string,
): Promise<string[]> {
  const url = threadsUrl(`/${GRAPH_VERSION}/debug_token`, {
    input_token: token,
    access_token: `TH|${app.clientId}|${app.secret}`,
  });
  try {
    const { data } = await graphGet(ctx, 'private', url, debugToken);
    if (data.is_valid) return data.scopes;
  } catch (error) {
    ctx.logger.warn(
      { error: error instanceof Error ? error.name : typeof error },
      'threads scope check failed',
    );
  }
  return [...WITHOUT_INSIGHTS];
}
