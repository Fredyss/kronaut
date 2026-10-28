import {
  type BaseContext,
  type ConnectedAccount,
  MAX_CONNECT_ACCOUNTS,
  type ProviderRuntime,
  TOO_MANY_ACCOUNTS,
} from '@kronaut/core';
import { Temporal } from 'temporal-polyfill';
import * as z from 'zod';
import { permanent } from '../_kit/meta-graph.ts';
import type { FacebookSettings } from './manifest.ts';
import {
  AUTHORIZE_URL,
  appSecret,
  exchangeCode,
  inspectPageToken,
  listPages,
  longLivedUserToken,
  type MetaApp,
  type Page,
  SCOPES,
} from './oauth.ts';
import { publishPost } from './publish.ts';
import { pollReel } from './reel.ts';
import { verifyPost } from './verify.ts';

const CREATE_CONTENT = 'CREATE_CONTENT';
const TOKEN_CHECKS_AT_ONCE = 5;

export const facebookCredentials = z.object({ accessToken: z.string().min(1) });
export type FacebookCredentials = z.infer<typeof facebookCredentials>;

type PublishablePage = Page & { readonly access_token: string };

function publishable(pages: readonly Page[]): PublishablePage[] {
  const byId = new Map<string, PublishablePage>();
  for (const page of pages) {
    const { access_token: token } = page;
    if (token === undefined || !page.tasks?.includes(CREATE_CONTENT)) continue;
    if (!byId.has(page.id)) byId.set(page.id, { ...page, access_token: token });
  }
  return [...byId.values()];
}

function httpsUrl(value: string | undefined): string | undefined {
  if (value === undefined || !URL.canParse(value)) return undefined;
  return new URL(value).protocol === 'https:' ? value : undefined;
}

async function connectedPage(
  ctx: BaseContext,
  app: MetaApp,
  page: PublishablePage,
): Promise<ConnectedAccount<FacebookCredentials>> {
  const token = await inspectPageToken(ctx, app, page.access_token);
  const profileUrl = httpsUrl(page.link);
  return {
    credentials: facebookCredentials.parse({ accessToken: page.access_token }),
    grantedScopes: token.scopes,
    ...(token.expiresAt > 0
      ? { accessExpiresAt: Temporal.Instant.fromEpochMilliseconds(token.expiresAt * 1000) }
      : {}),
    providerAccountId: page.id,
    accountKind: 'page',
    displayName: page.name,
    ...(page.username === undefined || page.username === '' ? {} : { handle: page.username }),
    ...(profileUrl === undefined ? {} : { profileUrl }),
  };
}

export const facebookRuntime: ProviderRuntime<FacebookCredentials, FacebookSettings> = {
  id: 'facebook',

  parseCredentials: (value) => facebookCredentials.parse(value),

  async connectStart(_ctx, input) {
    appSecret(input.app.clientSecret);
    const url = new URL(AUTHORIZE_URL);
    url.searchParams.set('client_id', input.app.clientId);
    url.searchParams.set('redirect_uri', input.redirectUri);
    url.searchParams.set('state', input.state);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', SCOPES.join(','));
    url.searchParams.set('auth_type', 'rerequest');
    return { authorizationUrl: url.toString(), pending: {} };
  },

  async connectFinish(ctx, input) {
    if (input.params.error !== undefined) throw permanent('authorization_denied');
    const code = input.params.code ?? '';
    if (code === '') throw permanent('code_missing');
    const app: MetaApp = {
      clientId: input.app.clientId,
      secret: appSecret(input.app.clientSecret),
    };

    const shortLived = await exchangeCode(ctx, app, { code, redirectUri: input.redirectUri });
    const userToken = await longLivedUserToken(ctx, app, shortLived);
    const pages = publishable(await listPages(ctx, app, userToken));
    if (pages.length > MAX_CONNECT_ACCOUNTS) throw permanent(TOO_MANY_ACCOUNTS);
    const accounts: ConnectedAccount<FacebookCredentials>[] = [];
    for (let start = 0; start < pages.length; start += TOKEN_CHECKS_AT_ONCE) {
      const batch = pages.slice(start, start + TOKEN_CHECKS_AT_ONCE);
      accounts.push(...(await Promise.all(batch.map((page) => connectedPage(ctx, app, page)))));
    }
    return accounts;
  },

  publish: publishPost,
  poll: pollReel,
  verify: verifyPost,
};
