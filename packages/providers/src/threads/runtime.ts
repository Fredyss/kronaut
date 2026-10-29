import {
  type BaseContext,
  type ConnectedAccount,
  type IssuedCredentials,
  ProviderFailure,
  type ProviderRuntime,
} from '@kronaut/core';
import { Temporal } from 'temporal-polyfill';
import * as z from 'zod';
import { graphGet, longLivedToken, permanent } from '../_kit/meta-graph.ts';
import { threadAnalytics, threadsFollowers } from './analytics.ts';
import { accountCapabilities } from './capabilities.ts';
import type { ThreadsSettings } from './manifest.ts';
import {
  AUTHORIZE_URL,
  GRAPH_VERSION,
  grantedScopes,
  PROFILE_FIELDS,
  profile,
  SCOPES,
  shortLivedAccessToken,
  threadsUrl,
} from './oauth.ts';
import { publishThread, verifyThread } from './publish.ts';

const MIN_REFRESH_AGE = Temporal.Duration.from({ hours: 24 });

export const threadsCredentials = z.object({
  userId: z.string().regex(/^\d+$/),
  accessToken: z.string().min(1),
  issuedAt: z.iso.datetime(),
  scopes: z.array(z.string()),
});
export type ThreadsCredentials = z.infer<typeof threadsCredentials>;

function appSecret(secret: string | undefined): string {
  if (secret !== undefined && secret !== '') return secret;
  throw new ProviderFailure({ kind: 'app_config', code: 'client_secret_missing' });
}

async function longLived(
  ctx: BaseContext,
  path: string,
  query: Readonly<Record<string, string>>,
): Promise<{ readonly accessToken: string; readonly expiresAt: Temporal.Instant }> {
  const token = await graphGet(ctx, 'private', threadsUrl(path, query), longLivedToken);
  return {
    accessToken: token.access_token,
    expiresAt: ctx.now().add({ seconds: token.expires_in }),
  };
}

function withExpiry(
  credentials: ThreadsCredentials,
  accessExpiresAt: Temporal.Instant,
): IssuedCredentials<ThreadsCredentials> {
  return { credentials, grantedScopes: credentials.scopes, accessExpiresAt };
}

export const threadsRuntime: ProviderRuntime<ThreadsCredentials, ThreadsSettings> = {
  id: 'threads',

  parseCredentials: (value) => threadsCredentials.parse(value),

  async connectStart(_ctx, input) {
    appSecret(input.app.clientSecret);
    const url = new URL(AUTHORIZE_URL);
    url.searchParams.set('client_id', input.app.clientId);
    url.searchParams.set('redirect_uri', input.redirectUri);
    url.searchParams.set('scope', SCOPES.join(','));
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('state', input.state);
    return { authorizationUrl: url.toString(), pending: {} };
  },

  async connectFinish(ctx, input): Promise<readonly ConnectedAccount<ThreadsCredentials>[]> {
    if (input.params.error !== undefined) throw permanent('authorization_denied');
    const code = input.params.code?.replace(/#_$/, '') ?? '';
    if (code === '') throw permanent('code_missing');
    const secret = appSecret(input.app.clientSecret);

    const shortLived = await shortLivedAccessToken(ctx, {
      client_id: input.app.clientId,
      client_secret: secret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: input.redirectUri,
    });
    const issuedAt = ctx.now();
    const token = await longLived(ctx, '/access_token', {
      grant_type: 'th_exchange_token',
      client_secret: secret,
      access_token: shortLived,
    });
    const me = await graphGet(
      ctx,
      'none',
      threadsUrl(`/${GRAPH_VERSION}/me`, {
        fields: PROFILE_FIELDS,
        access_token: token.accessToken,
      }),
      profile,
    );
    const name = me.name?.trim() ?? '';
    const credentials: ThreadsCredentials = {
      userId: me.id,
      accessToken: token.accessToken,
      issuedAt: issuedAt.toString(),
      scopes: await grantedScopes(ctx, { clientId: input.app.clientId, secret }, token.accessToken),
    };
    return [
      {
        ...withExpiry(credentials, token.expiresAt),
        providerAccountId: me.id,
        subjectId: me.id,
        accountKind: 'personal',
        handle: `@${me.username}`,
        displayName: name === '' ? me.username : name,
        profileUrl: `https://www.threads.com/@${encodeURIComponent(me.username)}`,
        capabilities: accountCapabilities(credentials.scopes),
      },
    ];
  },

  async refresh(ctx, { credentials }) {
    const oldEnough = Temporal.Instant.from(credentials.issuedAt).add(MIN_REFRESH_AGE);
    if (Temporal.Instant.compare(ctx.now(), oldEnough) < 0)
      throw new ProviderFailure({ kind: 'transient', detail: 'refresh_too_early' });
    const token = await longLived(ctx, '/refresh_access_token', {
      grant_type: 'th_refresh_token',
      access_token: credentials.accessToken,
    });
    const refreshed = { ...credentials, accessToken: token.accessToken };
    return withExpiry({ ...refreshed, issuedAt: ctx.now().toString() }, token.expiresAt);
  },

  publish: publishThread,
  verify: verifyThread,
  analytics: threadAnalytics,
  accountMetrics: threadsFollowers,
};
