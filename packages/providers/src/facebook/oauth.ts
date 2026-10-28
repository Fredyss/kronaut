import { createHmac } from 'node:crypto';
import { type BaseContext, ProviderFailure } from '@kronaut/core';
import * as z from 'zod';
import { graphGet, permanent } from '../_kit/meta-graph.ts';

export const GRAPH_VERSION = 'v26.0';
export const AUTHORIZE_URL = `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`;
export const ENGAGEMENT_SCOPE = 'pages_manage_engagement';
export const SCOPES = [
  'pages_show_list',
  'pages_manage_posts',
  'pages_read_engagement',
  ENGAGEMENT_SCOPE,
] as const;
export const GRAPH_HOST = 'graph.facebook.com';
const PAGE_FIELDS = 'id,name,access_token,tasks,link,username';
const PAGE_LIMIT = '100';
const MAX_NEXT_LINKS = 10;

export interface MetaApp {
  readonly clientId: string;
  readonly secret: string;
}

const accessToken = z.looseObject({ access_token: z.string().min(1) });

const page = z.looseObject({
  id: z.string().regex(/^\d{1,32}$/),
  name: z.string(),
  access_token: z.string().min(1).optional(),
  tasks: z.array(z.string()).optional(),
  link: z.string().optional(),
  username: z.string().optional(),
});
export type Page = z.infer<typeof page>;

const accountsPage = z.looseObject({
  data: z.array(page),
  paging: z.looseObject({ next: z.string().optional() }).optional(),
});

const debugToken = z.looseObject({
  data: z.looseObject({
    app_id: z.string(),
    is_valid: z.boolean(),
    scopes: z.array(z.string()).default([]),
    expires_at: z.number().int().nonnegative().optional(),
  }),
});

export interface PageToken {
  readonly scopes: readonly string[];
  readonly expiresAt: number;
}

export function appSecret(secret: string | undefined): string {
  if (secret !== undefined && secret !== '') return secret;
  throw new ProviderFailure({ kind: 'app_config', code: 'client_secret_missing' });
}

export function appsecretProof(secret: string, token: string): string {
  return createHmac('sha256', secret).update(token, 'utf8').digest('hex');
}

export function graphUrl(path: string, query: Readonly<Record<string, string>>): URL {
  const url = new URL(`/${GRAPH_VERSION}/${path}`, `https://${GRAPH_HOST}`);
  for (const [name, value] of Object.entries(query)) url.searchParams.set(name, value);
  return url;
}

function signed(url: URL, app: MetaApp, token: string): URL {
  url.searchParams.set('access_token', token);
  url.searchParams.set('appsecret_proof', appsecretProof(app.secret, token));
  return url;
}

export async function exchangeCode(
  ctx: BaseContext,
  app: MetaApp,
  input: { readonly code: string; readonly redirectUri: string },
): Promise<string> {
  const url = graphUrl('oauth/access_token', {
    client_id: app.clientId,
    redirect_uri: input.redirectUri,
    client_secret: app.secret,
    code: input.code,
  });
  return (await graphGet(ctx, 'private', url, accessToken)).access_token;
}

export async function longLivedUserToken(
  ctx: BaseContext,
  app: MetaApp,
  shortLived: string,
): Promise<string> {
  const url = graphUrl('oauth/access_token', {
    grant_type: 'fb_exchange_token',
    client_id: app.clientId,
    client_secret: app.secret,
    fb_exchange_token: shortLived,
  });
  return (await graphGet(ctx, 'private', url, accessToken)).access_token;
}

function nextLink(next: string | undefined, app: MetaApp, token: string): URL | undefined {
  if (next === undefined || !URL.canParse(next)) return undefined;
  const url = new URL(next);
  if (url.protocol !== 'https:' || url.hostname !== GRAPH_HOST) return undefined;
  return signed(url, app, token);
}

export async function listPages(
  ctx: BaseContext,
  app: MetaApp,
  userToken: string,
): Promise<readonly Page[]> {
  const pages: Page[] = [];
  const first = graphUrl('me/accounts', { fields: PAGE_FIELDS, limit: PAGE_LIMIT });
  let url: URL | undefined = signed(first, app, userToken);
  for (let follows = 0; url !== undefined; follows += 1) {
    const result: z.infer<typeof accountsPage> = await graphGet(ctx, 'none', url, accountsPage);
    pages.push(...result.data);
    url = follows < MAX_NEXT_LINKS ? nextLink(result.paging?.next, app, userToken) : undefined;
  }
  return pages;
}

export async function inspectPageToken(
  ctx: BaseContext,
  app: MetaApp,
  pageToken: string,
): Promise<PageToken> {
  const url = graphUrl('debug_token', {
    input_token: pageToken,
    access_token: `${app.clientId}|${app.secret}`,
  });
  const { data } = await graphGet(ctx, 'none', url, debugToken);
  if (!data.is_valid) throw permanent('page_token_invalid');
  if (data.app_id !== app.clientId) throw permanent('page_token_app_mismatch');
  return { scopes: data.scopes, expiresAt: data.expires_at ?? 0 };
}
