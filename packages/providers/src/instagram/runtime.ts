import {
  type ConnectedAccount,
  type IssuedCredentials,
  ProviderFailure,
  type ProviderRuntime,
} from '@kronaut/core';
import { Temporal } from 'temporal-polyfill';
import * as z from 'zod';
import { scopeCapabilities } from '../_kit/meta-scopes.ts';
import { accountMetrics, mediaAnalytics } from './analytics.ts';
import type { InstagramSettings } from './manifest.ts';
import {
  AUTHORIZE_URL,
  COMMENTS_SCOPE,
  exchangeCode,
  GRAPH_VERSION,
  graphGet,
  graphUrl,
  INSIGHTS_SCOPE,
  longLivedToken,
  PROFILE_FIELDS,
  PUBLISH_SCOPE,
  permanent,
  profile,
  SCOPES,
} from './oauth.ts';
import { publishMedia, verifyMedia } from './publish.ts';

const MIN_REFRESH_AGE = Temporal.Duration.from({ hours: 24 });

export const instagramCredentials = z.object({
  userId: z.string().regex(/^\d+$/),
  accessToken: z.string().min(1),
  issuedAt: z.iso.datetime(),
  scopes: z.array(z.string()),
});
export type InstagramCredentials = z.infer<typeof instagramCredentials>;

function requireSecret(secret: string | undefined): string {
  if (secret === undefined || secret === '')
    throw new ProviderFailure({ kind: 'app_config', code: 'client_secret_missing' });
  return secret;
}

function accountKind(type: string | null | undefined): 'business' | 'creator' {
  return type?.toUpperCase() === 'MEDIA_CREATOR' ? 'creator' : 'business';
}

function issued(
  now: Temporal.Instant,
  expiresIn: number,
  credentials: InstagramCredentials,
): IssuedCredentials<InstagramCredentials> {
  return {
    credentials,
    grantedScopes: credentials.scopes,
    accessExpiresAt: now.add({ seconds: expiresIn }),
  };
}

export const instagramRuntime: ProviderRuntime<InstagramCredentials, InstagramSettings> = {
  id: 'instagram',

  parseCredentials: (value) => instagramCredentials.parse(value),

  async connectStart(_ctx, input) {
    requireSecret(input.app.clientSecret);
    const url = new URL(AUTHORIZE_URL);
    url.searchParams.set('client_id', input.app.clientId);
    url.searchParams.set('redirect_uri', input.redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', SCOPES.join(','));
    url.searchParams.set('state', input.state);
    url.searchParams.set('force_reauth', 'true');
    return { authorizationUrl: url.toString(), pending: {} };
  },

  async connectFinish(ctx, input): Promise<readonly ConnectedAccount<InstagramCredentials>[]> {
    if (input.params.error !== undefined) throw permanent('authorization_denied');
    const code = input.params.code?.replace(/#_$/, '');
    if (code === undefined || code === '') throw permanent('code_missing');
    const secret = requireSecret(input.app.clientSecret);

    const exchanged = await exchangeCode(ctx, {
      client_id: input.app.clientId,
      client_secret: secret,
      grant_type: 'authorization_code',
      redirect_uri: input.redirectUri,
      code,
    });
    if (!exchanged.permissions.includes(PUBLISH_SCOPE)) throw permanent('missing_permission');

    const token = await graphGet(
      ctx,
      'private',
      graphUrl('/access_token', {
        grant_type: 'ig_exchange_token',
        client_secret: secret,
        access_token: exchanged.access_token,
      }),
      longLivedToken,
    );
    const now = ctx.now();
    const me = await graphGet(
      ctx,
      'none',
      graphUrl(`/${GRAPH_VERSION}/me`, {
        fields: PROFILE_FIELDS,
        access_token: token.access_token,
      }),
      profile,
    );
    const name = me.name?.trim();
    return [
      {
        ...issued(now, token.expires_in, {
          userId: me.user_id,
          accessToken: token.access_token,
          issuedAt: now.toString(),
          scopes: exchanged.permissions,
        }),
        providerAccountId: me.user_id,
        ...(me.id === undefined ? {} : { subjectId: me.id }),
        accountKind: accountKind(me.account_type),
        handle: me.username,
        displayName: name === undefined || name === '' ? me.username : name,
        profileUrl: `https://www.instagram.com/${encodeURIComponent(me.username)}/`,
        capabilities: scopeCapabilities(exchanged.permissions, {
          comments: COMMENTS_SCOPE,
          insights: INSIGHTS_SCOPE,
        }),
      },
    ];
  },

  async refresh(ctx, input) {
    const stored = input.credentials;
    const now = ctx.now();
    const refreshableAt = Temporal.Instant.from(stored.issuedAt).add(MIN_REFRESH_AGE);
    if (Temporal.Instant.compare(now, refreshableAt) < 0)
      throw new ProviderFailure({ kind: 'transient', detail: 'refresh_too_early' });
    const token = await graphGet(
      ctx,
      'private',
      graphUrl('/refresh_access_token', {
        grant_type: 'ig_refresh_token',
        access_token: stored.accessToken,
      }),
      longLivedToken,
    );
    const refreshedAt = ctx.now();
    return issued(refreshedAt, token.expires_in, {
      ...stored,
      accessToken: token.access_token,
      issuedAt: refreshedAt.toString(),
    });
  },

  publish: publishMedia,
  verify: verifyMedia,
  analytics: mediaAnalytics,
  accountMetrics,
};
