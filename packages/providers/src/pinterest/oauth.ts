import {
  type BaseContext,
  type IssuedCredentials,
  ProviderFailure,
  type RefreshInput,
} from '@kronaut/core';
import { Temporal } from 'temporal-polyfill';
import * as z from 'zod';
import { readJson, send } from '../_kit/http.ts';
import { permanent } from '../_kit/meta-graph.ts';
import { isSuccess } from './errors.ts';

export const AUTHORIZE_URL = 'https://www.pinterest.com/oauth/';
export const API_BASE = 'https://api.pinterest.com/v5';
const TOKEN_URL = `${API_BASE}/oauth/token`;
export const SCOPES = [
  'boards:read',
  'boards:write',
  'pins:read',
  'pins:write',
  'user_accounts:read',
] as const;

export const pinterestCredentials = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
});
export type PinterestCredentials = z.infer<typeof pinterestCredentials>;

const tokenResponse = z.looseObject({
  access_token: z.string().min(1),
  expires_in: z.number().int().positive(),
  scope: z.string().optional(),
  refresh_token: z.string().min(1).optional(),
  refresh_token_expires_in: z.number().int().positive().optional(),
  refresh_token_expires_at: z.number().int().positive().optional(),
});
type TokenResponse = z.infer<typeof tokenResponse>;

export interface CodeGrant {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly code: string;
  readonly redirectUri: string;
}

export function appSecret(secret: string | undefined): string {
  if (secret !== undefined && secret !== '') return secret;
  throw new ProviderFailure({ kind: 'app_config', code: 'client_secret_missing' });
}

function scopesOf(scope: string | undefined): readonly string[] {
  return (scope ?? '').split(/[\s,]+/).filter((entry) => entry !== '');
}

function basic(clientId: string, clientSecret: string): string {
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`, 'utf8').toString('base64')}`;
}

function postToken(ctx: BaseContext, authorization: string, form: Record<string, string>) {
  return send(ctx, 'private', TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: authorization,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(form).toString(),
  });
}

function retryable(status: number): boolean {
  return status === 429 || status >= 500;
}

function transient(status: number): ProviderFailure {
  return new ProviderFailure({ kind: 'transient', detail: `http_${status}` });
}

function refreshExpiry(
  now: Temporal.Instant,
  token: TokenResponse,
): { readonly refreshExpiresAt?: Temporal.Instant } {
  const seconds = token.refresh_token_expires_in;
  if (seconds !== undefined) return { refreshExpiresAt: now.add({ seconds }) };
  const at = token.refresh_token_expires_at;
  return at === undefined
    ? {}
    : { refreshExpiresAt: Temporal.Instant.fromEpochMilliseconds(at * 1000) };
}

export interface ExchangedToken {
  readonly credentials: PinterestCredentials;
  readonly grantedScopes: readonly string[];
  readonly accessExpiresAt: Temporal.Instant;
  readonly refreshExpiresAt?: Temporal.Instant;
}

export async function exchangeCode(ctx: BaseContext, grant: CodeGrant): Promise<ExchangedToken> {
  const response = await postToken(ctx, basic(grant.clientId, grant.clientSecret), {
    grant_type: 'authorization_code',
    code: grant.code,
    redirect_uri: grant.redirectUri,
    continuous_refresh: 'true',
  });
  if (retryable(response.status)) throw transient(response.status);
  if (response.status === 401)
    throw new ProviderFailure({ kind: 'app_config', code: 'client_invalid' });
  if (!isSuccess(response.status))
    throw permanent('code_exchange_failed', `http_${response.status}`);
  const token = await readJson(response, tokenResponse, 'private');
  if (token.refresh_token === undefined) throw permanent('refresh_token_missing');
  return {
    credentials: { accessToken: token.access_token, refreshToken: token.refresh_token },
    grantedScopes: scopesOf(token.scope),
    accessExpiresAt: ctx.now().add({ seconds: token.expires_in }),
    ...refreshExpiry(ctx.now(), token),
  };
}

export async function refreshAccess(
  ctx: BaseContext,
  { app, credentials }: RefreshInput<PinterestCredentials>,
): Promise<IssuedCredentials<PinterestCredentials>> {
  const response = await postToken(ctx, basic(app.clientId, appSecret(app.clientSecret)), {
    grant_type: 'refresh_token',
    refresh_token: credentials.refreshToken,
  });
  const { status } = response;
  if (retryable(status)) throw transient(status);
  if (status === 400) throw new ProviderFailure({ kind: 'auth_revoked' });
  if (status === 401) throw new ProviderFailure({ kind: 'app_config', code: 'client_invalid' });
  if (!isSuccess(status)) throw permanent('refresh_failed', `http_${status}`);
  const token = await readJson(response, tokenResponse, 'private');
  const granted = scopesOf(token.scope);
  return {
    credentials: {
      accessToken: token.access_token,
      refreshToken: token.refresh_token ?? credentials.refreshToken,
    },
    grantedScopes: granted.length === 0 ? [...SCOPES] : granted,
    accessExpiresAt: ctx.now().add({ seconds: token.expires_in }),
    ...(token.refresh_token === undefined ? {} : refreshExpiry(ctx.now(), token)),
  };
}
