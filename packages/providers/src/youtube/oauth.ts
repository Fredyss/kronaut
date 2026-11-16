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
import { readJson, send, tryJson } from '../_kit/http.ts';
import { permanent } from '../_kit/meta-graph.ts';
import { isSuccess } from './errors.ts';

export const AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const REVOKE_URL = 'https://oauth2.googleapis.com/revoke';
export const SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.readonly',
] as const;

export const youtubeCredentials = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
});
export type YoutubeCredentials = z.infer<typeof youtubeCredentials>;

const tokenResponse = z.looseObject({
  access_token: z.string().min(1),
  expires_in: z.number().int().positive(),
  scope: z.string().optional(),
  refresh_token: z.string().min(1).optional(),
  refresh_token_expires_in: z.number().int().positive().optional(),
});
export type TokenResponse = z.infer<typeof tokenResponse>;

const oauthError = z.looseObject({ error: z.string() });

export interface CodeGrant {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly code: string;
  readonly redirectUri: string;
  readonly verifier: string;
}

export function appSecret(secret: string | undefined): string {
  if (secret !== undefined && secret !== '') return secret;
  throw new ProviderFailure({ kind: 'app_config', code: 'client_secret_missing' });
}

export function scopesOf(scope: string | undefined): readonly string[] {
  return (scope ?? '').split(' ').filter((entry) => entry !== '');
}

function retryable(status: number): boolean {
  return status === 429 || status >= 500;
}

function transient(status: number): ProviderFailure {
  return new ProviderFailure({ kind: 'transient', detail: `http_${status}` });
}

async function errorOf(response: ProviderHttpResponse): Promise<string | undefined> {
  return oauthError.safeParse(await tryJson(response)).data?.error;
}

const CLIENT_ERRORS: Readonly<Record<string, string>> = {
  invalid_client: 'client_invalid',
  deleted_client: 'client_deleted',
};

function clientFailure(error: string | undefined): ProviderFailure | undefined {
  const code =
    error !== undefined && Object.hasOwn(CLIENT_ERRORS, error) ? CLIENT_ERRORS[error] : undefined;
  return code === undefined ? undefined : new ProviderFailure({ kind: 'app_config', code });
}

export function refreshExpiry(
  now: Temporal.Instant,
  token: TokenResponse,
): { readonly refreshExpiresAt?: Temporal.Instant } {
  const seconds = token.refresh_token_expires_in;
  return seconds === undefined ? {} : { refreshExpiresAt: now.add({ seconds }) };
}

function postForm(ctx: BaseContext, url: string, form: Record<string, string>) {
  return send(ctx, 'private', url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(form).toString(),
  });
}

export async function exchangeCode(ctx: BaseContext, grant: CodeGrant): Promise<TokenResponse> {
  const response = await postForm(ctx, TOKEN_URL, {
    grant_type: 'authorization_code',
    code: grant.code,
    client_id: grant.clientId,
    client_secret: grant.clientSecret,
    redirect_uri: grant.redirectUri,
    code_verifier: grant.verifier,
  });
  if (retryable(response.status)) throw transient(response.status);
  if (!isSuccess(response.status)) {
    throw (
      clientFailure(await errorOf(response)) ??
      permanent('code_exchange_failed', `http_${response.status}`)
    );
  }
  return readJson(response, tokenResponse, 'private');
}

export async function refreshAccess(
  ctx: BaseContext,
  { app, credentials }: RefreshInput<YoutubeCredentials>,
): Promise<IssuedCredentials<YoutubeCredentials>> {
  const response = await postForm(ctx, TOKEN_URL, {
    grant_type: 'refresh_token',
    client_id: app.clientId,
    client_secret: appSecret(app.clientSecret),
    refresh_token: credentials.refreshToken,
  });
  const { status } = response;
  if (retryable(status)) throw transient(status);
  if (!isSuccess(status)) {
    const error = await errorOf(response);
    if (status === 400 && error === 'invalid_grant')
      throw new ProviderFailure({ kind: 'auth_revoked' });
    throw clientFailure(error) ?? permanent('refresh_failed', `http_${status}`);
  }
  const token = await readJson(response, tokenResponse, 'private');
  const granted = scopesOf(token.scope);
  return {
    credentials: {
      accessToken: token.access_token,
      refreshToken: token.refresh_token ?? credentials.refreshToken,
    },
    grantedScopes: granted.length === 0 ? [...SCOPES] : granted,
    accessExpiresAt: ctx.now().add({ seconds: token.expires_in }),
    ...refreshExpiry(ctx.now(), token),
  };
}

export async function revokeGrant(
  ctx: BaseContext,
  { credentials }: RevokeInput<YoutubeCredentials>,
): Promise<void> {
  const response = await postForm(ctx, REVOKE_URL, { token: credentials.refreshToken });
  if (response.status === 200) return;
  if (response.status === 400 && (await errorOf(response)) === 'invalid_token') return;
  throw transient(response.status);
}
