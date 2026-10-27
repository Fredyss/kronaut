import { type BaseContext, ProviderFailure } from '@kronaut/core';
import * as z from 'zod';
import { readJson, send } from '../_kit/http.ts';
import { permanent } from '../_kit/meta-graph.ts';
import { isSuccess, linkedinFailure } from './errors.ts';

export const AUTHORIZE_URL = 'https://www.linkedin.com/oauth/v2/authorization';
const TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
const USERINFO_URL = 'https://api.linkedin.com/v2/userinfo';
export const SCOPES = ['openid', 'profile', 'w_member_social'] as const;

export const memberId = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/);

const tokenResponse = z.looseObject({
  access_token: z.string().min(1),
  expires_in: z.number().int().positive(),
  scope: z.string().optional(),
  refresh_token: z.string().min(1).optional(),
});
export type TokenResponse = z.infer<typeof tokenResponse>;

const userInfo = z.looseObject({
  sub: memberId,
  name: z.string().optional(),
});
export type UserInfo = z.infer<typeof userInfo>;

export interface CodeGrant {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly code: string;
  readonly redirectUri: string;
}

export function authorUrn(sub: string): string {
  return `urn:li:person:${sub}`;
}

export function appSecret(secret: string | undefined): string {
  if (secret !== undefined && secret !== '') return secret;
  throw new ProviderFailure({ kind: 'app_config', code: 'client_secret_missing' });
}

export function callbackCode(params: Readonly<Record<string, string>>): string {
  if (params.error !== undefined) throw permanent('authorization_denied');
  const code = params.code ?? '';
  if (code === '') throw permanent('code_missing');
  return code;
}

export function grantedScopes(scope: string | undefined): readonly string[] {
  const granted = (scope ?? '').split(/[\s,]+/).filter((entry) => entry !== '');
  return granted.length === 0 ? [...SCOPES] : granted;
}

export async function exchangeCode(ctx: BaseContext, grant: CodeGrant): Promise<TokenResponse> {
  const form = new URLSearchParams({
    grant_type: 'authorization_code',
    code: grant.code,
    client_id: grant.clientId,
    client_secret: grant.clientSecret,
    redirect_uri: grant.redirectUri,
  });
  const response = await send(ctx, 'private', TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });
  const { status } = response;
  if (status === 429 || status >= 500)
    throw new ProviderFailure({ kind: 'transient', detail: `http_${status}` });
  if (!isSuccess(status)) throw permanent('code_exchange_failed', `http_${status}`);
  return readJson(response, tokenResponse, 'private');
}

export async function readUserInfo(ctx: BaseContext, accessToken: string): Promise<UserInfo> {
  const response = await send(ctx, 'none', USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!isSuccess(response.status)) throw await linkedinFailure(response, 'none', ctx.now());
  return readJson(response, userInfo, 'none');
}
