import {
  type BaseContext,
  type ConnectFinishInput,
  type ConnectStartInput,
  ProviderFailure,
} from '@kronaut/core';
import * as z from 'zod';
import { readJson, send, tryJson } from '../http.ts';
import { permanent } from '../meta-graph.ts';
import { isSuccess } from './api.ts';

const AUTHORIZE_URL = 'https://discord.com/oauth2/authorize';
const TOKEN_URL = 'https://discord.com/api/oauth2/token';

const oauthError = z.looseObject({ error: z.string() });

export function appSecret(value: string | undefined, missing: string): string {
  if (value !== undefined && value !== '') return value;
  throw new ProviderFailure({ kind: 'app_config', code: missing });
}

export function authorizeUrl(
  input: ConnectStartInput,
  extra: Readonly<Record<string, string>>,
): string {
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', input.app.clientId);
  for (const [name, value] of Object.entries(extra)) url.searchParams.set(name, value);
  url.searchParams.set('state', input.state);
  url.searchParams.set('redirect_uri', input.redirectUri);
  return url.toString();
}

export function grantedScopes(scope: string | undefined): string[] {
  return (scope ?? '').split(' ').filter((entry) => entry !== '');
}

export async function exchangeCode<T>(
  ctx: BaseContext,
  input: ConnectFinishInput,
  schema: z.ZodType<T>,
): Promise<T> {
  if (input.params.error !== undefined) throw permanent('authorization_denied');
  const code = input.params.code ?? '';
  if (code === '') throw permanent('code_missing');
  const response = await send(ctx, 'private', TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: input.redirectUri,
      client_id: input.app.clientId,
      client_secret: appSecret(input.app.clientSecret, 'client_secret_missing'),
    }).toString(),
  });
  if (response.status === 429 || response.status >= 500)
    throw new ProviderFailure({ kind: 'transient', detail: `http_${response.status}` });
  if (!isSuccess(response.status)) {
    const error = oauthError.safeParse(await tryJson(response)).data?.error;
    if (error === 'invalid_client')
      throw new ProviderFailure({ kind: 'app_config', code: 'client_invalid' });
    throw permanent('code_exchange_failed', `http_${response.status}`);
  }
  return readJson(response, schema, 'private');
}
