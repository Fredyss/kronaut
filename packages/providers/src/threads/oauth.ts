import { type BaseContext, ProviderFailure } from '@kronaut/core';
import * as z from 'zod';
import { readJson, send } from '../_kit/http.ts';
import { permanent } from '../_kit/meta-graph.ts';

export const AUTHORIZE_URL = 'https://threads.com/oauth/authorize';
export const GRAPH_ORIGIN = 'https://graph.threads.com';
const TOKEN_PATH = '/oauth/access_token';
export const GRAPH_VERSION = 'v1.0';
export const SCOPES = [
  'threads_basic',
  'threads_content_publish',
  'threads_manage_replies',
] as const;
export const PROFILE_FIELDS = 'id,username,name,threads_profile_picture_url';

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
