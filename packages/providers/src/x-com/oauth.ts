import {
  type BaseContext,
  type IssuedCredentials,
  ProviderFailure,
  type ProviderHttpResponse,
  type RefreshInput,
  type RevokeInput,
} from '@kronaut/core';
import type { Temporal } from 'temporal-polyfill';
import * as z from 'zod';
import { readJson, send } from '../_kit/http.ts';
import { permanent } from '../_kit/meta-graph.ts';
import { creditsDepleted, isSuccess } from './errors.ts';

export const AUTHORIZE_URL = 'https://x.com/i/oauth2/authorize';
export const API_BASE = 'https://api.x.com/2';
const TOKEN_URL = `${API_BASE}/oauth2/token`;
const REVOKE_URL = `${API_BASE}/oauth2/revoke`;
export const SCOPES = [
  'tweet.read',
  'tweet.write',
  'users.read',
  'media.write',
  'offline.access',
] as const;

export const xCredentials = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
});
export type XCredentials = z.infer<typeof xCredentials>;

const CLIENT_ERRORS: ReadonlySet<string> = new Set(['invalid_client', 'unauthorized_client']);
const oauthError = z.looseObject({ error: z.string().optional() });

const tokenResponse = z.looseObject({
  access_token: z.string().min(1),
  expires_in: z.number().int().positive(),
  scope: z.string().optional(),
  refresh_token: z.string().min(1).optional(),
});

export interface CodeGrant {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly code: string;
  readonly redirectUri: string;
  readonly verifier: string;
}

export interface ExchangedToken {
  readonly credentials: XCredentials;
  readonly grantedScopes: readonly string[];
  readonly accessExpiresAt: Temporal.Instant;
}

export function appSecret(secret: string | undefined): string {
  if (secret === undefined || secret === '')
    throw new ProviderFailure({ kind: 'app_config', code: 'client_secret_missing' });
  return secret;
}

function grantedScopes(scope: string | undefined): readonly string[] {
  return (scope ?? '').split(' ').filter((entry) => entry !== '');
}

function basicAuth(clientId: string, clientSecret: string): string {
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`, 'utf8').toString('base64')}`;
}

function postForm(
  ctx: BaseContext,
  url: string,
  authorization: string,
  form: Record<string, string>,
) {
  return send(ctx, 'private', url, {
    method: 'POST',
    headers: { Authorization: authorization, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(form).toString(),
  });
}

async function bodyText(response: ProviderHttpResponse): Promise<string> {
  try {
    return await response.text();
  } catch {
    return '';
  }
}

function clientRejected(text: string): boolean {
  try {
    return CLIENT_ERRORS.has(oauthError.safeParse(JSON.parse(text)).data?.error ?? '');
  } catch {
    return false;
  }
}

async function tokenFailure(
  response: ProviderHttpResponse,
  rejected: () => ProviderFailure,
): Promise<ProviderFailure> {
  const { status } = response;
  const detail = `http_${status}`;
  if (status === 429 || status >= 500) return new ProviderFailure({ kind: 'transient', detail });
  const text = await bodyText(response);
  if (creditsDepleted(status, text))
    return new ProviderFailure({ kind: 'permanent', code: 'credits_depleted', detail });
  if (clientRejected(text))
    return new ProviderFailure({ kind: 'app_config', code: 'client_invalid' });
  return rejected();
}

export async function exchangeCode(ctx: BaseContext, grant: CodeGrant): Promise<ExchangedToken> {
  const response = await postForm(ctx, TOKEN_URL, basicAuth(grant.clientId, grant.clientSecret), {
    grant_type: 'authorization_code',
    code: grant.code,
    redirect_uri: grant.redirectUri,
    code_verifier: grant.verifier,
  });
  if (!isSuccess(response.status))
    throw await tokenFailure(response, () =>
      permanent('code_exchange_failed', `http_${response.status}`),
    );
  const token = await readJson(response, tokenResponse, 'private');
  if (token.refresh_token === undefined) throw permanent('refresh_token_missing');
  return {
    credentials: { accessToken: token.access_token, refreshToken: token.refresh_token },
    grantedScopes: grantedScopes(token.scope),
    accessExpiresAt: ctx.now().add({ seconds: token.expires_in }),
  };
}

export async function refreshAccess(
  ctx: BaseContext,
  { app, credentials }: RefreshInput<XCredentials>,
): Promise<IssuedCredentials<XCredentials>> {
  const response = await postForm(
    ctx,
    TOKEN_URL,
    basicAuth(app.clientId, appSecret(app.clientSecret)),
    {
      grant_type: 'refresh_token',
      refresh_token: credentials.refreshToken,
    },
  );
  const { status } = response;
  if (!isSuccess(status))
    throw await tokenFailure(response, () =>
      status === 400
        ? new ProviderFailure({ kind: 'auth_revoked' })
        : permanent('refresh_failed', `http_${status}`),
    );
  const token = await readJson(response, tokenResponse, 'private');
  const granted = grantedScopes(token.scope);
  return {
    credentials: {
      accessToken: token.access_token,
      refreshToken: token.refresh_token ?? credentials.refreshToken,
    },
    grantedScopes: granted.length === 0 ? [...SCOPES] : granted,
    accessExpiresAt: ctx.now().add({ seconds: token.expires_in }),
  };
}

export async function revokeTokens(
  ctx: BaseContext,
  { app, credentials }: RevokeInput<XCredentials>,
): Promise<void> {
  const authorization = basicAuth(app.clientId, appSecret(app.clientSecret));
  let failure: ProviderFailure | undefined;
  for (const token of [credentials.refreshToken, credentials.accessToken]) {
    const response = await postForm(ctx, REVOKE_URL, authorization, { token });
    if (isSuccess(response.status)) continue;
    failure ??= await tokenFailure(response, () =>
      permanent('revoke_rejected', `http_${response.status}`),
    );
  }
  if (failure !== undefined) throw failure;
}
