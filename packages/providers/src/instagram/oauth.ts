import type { BaseContext } from '@kronaut/core';
import * as z from 'zod';
import { readJson, send } from '../_kit/http.ts';
import { permanent, transient } from '../_kit/meta-graph.ts';

export {
  type GraphErrorCodes,
  graphErrorCodes,
  graphErrorDetail,
  graphFailure,
  graphFailureFrom,
  graphGet,
  longLivedToken,
  permanent,
  RATE_LIMIT_CODES,
  TOKEN_INVALID,
} from '../_kit/meta-graph.ts';

export const AUTHORIZE_URL = 'https://www.instagram.com/oauth/authorize';
export const TOKEN_URL = 'https://api.instagram.com/oauth/access_token';
export const GRAPH_ORIGIN = 'https://graph.instagram.com';
export const GRAPH_VERSION = 'v26.0';
export const PUBLISH_SCOPE = 'instagram_business_content_publish';
export const COMMENTS_SCOPE = 'instagram_business_manage_comments';
export const INSIGHTS_SCOPE = 'instagram_business_manage_insights';
export const SCOPES = [
  'instagram_business_basic',
  PUBLISH_SCOPE,
  COMMENTS_SCOPE,
  INSIGHTS_SCOPE,
] as const;
export const PROFILE_FIELDS = 'id,user_id,username,name,account_type,profile_picture_url';

const igId = z
  .union([
    z.string().regex(/^\d{1,32}$/),
    z.number().int().nonnegative().refine(Number.isSafeInteger),
  ])
  .transform(String);

const permissions = z
  .union([z.string(), z.array(z.string())])
  .transform((value) =>
    (typeof value === 'string' ? value.split(',') : value)
      .map((scope) => scope.trim())
      .filter((scope) => scope !== ''),
  );

function wrappedOrFlat<T extends z.ZodType>(entry: T) {
  return z.union([
    z
      .looseObject({ data: z.array(entry).min(1) })
      .transform((value) => value.data[0] as z.output<T>),
    entry,
  ]);
}

export const codeExchange = wrappedOrFlat(
  z.looseObject({ access_token: z.string().min(1), permissions }),
);

export const profile = wrappedOrFlat(
  z.looseObject({
    id: igId.optional(),
    user_id: igId,
    username: z.string().min(1),
    name: z.string().nullish(),
    account_type: z.string().nullish(),
  }),
);

export function graphUrl(path: string, query: Readonly<Record<string, string>>): URL {
  const url = new URL(path, GRAPH_ORIGIN);
  for (const [name, value] of Object.entries(query)) url.searchParams.set(name, value);
  return url;
}

export async function exchangeCode(
  ctx: BaseContext,
  fields: Readonly<Record<string, string>>,
): Promise<z.output<typeof codeExchange>> {
  const response = await send(ctx, 'private', TOKEN_URL, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(fields).toString(),
  });
  if (response.status >= 500 || response.status === 429) throw transient(response.status);
  if (response.status !== 200) throw permanent('code_exchange_failed');
  return readJson(response, codeExchange, 'private');
}
