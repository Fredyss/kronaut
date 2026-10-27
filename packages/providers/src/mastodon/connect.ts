import type {
  BaseContext,
  ConnectedAccount,
  ConnectFinishInput,
  ConnectStart,
  ConnectStartInput,
  ProviderApp,
  RegisterAppInput,
  RegisteredApp,
} from '@kronaut/core';
import { ProviderFailure } from '@kronaut/core';
import * as z from 'zod';
import { readJson, send } from '../_kit/http.ts';
import { pkcePair } from '../_kit/pkce.ts';
import {
  apiUrl,
  callJson,
  errorCode,
  instanceOrigin,
  originOf,
  permanent,
  retryable,
  SCOPE,
  secretOf,
  transient,
} from './api.ts';
import { readCapabilities } from './capabilities.ts';

export interface MastodonCredentials {
  readonly accessToken: string;
}

const pendingState = z.object({ verifier: z.string().min(1) });

const registeredApp = z.looseObject({
  client_id: z.string().min(1),
  client_secret: z.string().min(1),
});

const tokenResponse = z.looseObject({
  access_token: z.string().min(1),
  token_type: z.string(),
  scope: z.string().optional(),
});

const account = z.looseObject({
  id: z.string().regex(/^[A-Za-z0-9]{1,64}$/),
  username: z.string().regex(/^[A-Za-z0-9_.-]{1,64}$/),
  display_name: z.string().nullish(),
  url: z.string().nullish(),
});

export function httpsUrl(value: string | null | undefined): string | undefined {
  if (value === null || value === undefined) return undefined;
  try {
    return new URL(value).protocol === 'https:' ? value : undefined;
  } catch {
    return undefined;
  }
}

export async function registerApp(
  ctx: BaseContext,
  input: RegisterAppInput,
): Promise<RegisteredApp> {
  const origin = instanceOrigin(input.instanceHost);
  const app = await callJson(ctx, {
    effect: 'private',
    url: apiUrl(origin, '/api/v1/apps'),
    schema: registeredApp,
    failure: 'app_registration_rejected',
    init: {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        client_name: input.clientName,
        redirect_uris: [input.redirectUri],
        scopes: SCOPE,
        ...(input.website === undefined ? {} : { website: input.website }),
      }),
    },
  });
  return { clientId: app.client_id, clientSecret: app.client_secret };
}

export async function connectStart(
  _ctx: BaseContext,
  input: ConnectStartInput,
): Promise<ConnectStart> {
  const origin = originOf(input.app);
  secretOf(input.app);
  const { verifier, challenge } = pkcePair();
  const url = apiUrl(origin, '/oauth/authorize');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', input.app.clientId);
  url.searchParams.set('redirect_uri', input.redirectUri);
  url.searchParams.set('scope', SCOPE);
  url.searchParams.set('state', input.state);
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  return { authorizationUrl: url.toString(), pending: { verifier } };
}

interface Exchange {
  readonly app: ProviderApp;
  readonly origin: string;
  readonly redirectUri: string;
  readonly code: string;
  readonly verifier: string;
}

async function exchangeCode(
  ctx: BaseContext,
  exchange: Exchange,
): Promise<z.output<typeof tokenResponse>> {
  const response = await send(ctx, 'private', apiUrl(exchange.origin, '/oauth/token'), {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: exchange.code,
      client_id: exchange.app.clientId,
      client_secret: secretOf(exchange.app),
      redirect_uri: exchange.redirectUri,
      code_verifier: exchange.verifier,
    }).toString(),
  });
  if (retryable(response.status)) throw transient(response.status);
  if (response.status !== 200) {
    const code = await errorCode(response);
    if ((response.status === 400 || response.status === 401) && code === 'invalid_client')
      throw new ProviderFailure({ kind: 'app_config', code });
    throw permanent(code ?? 'code_exchange_failed');
  }
  return readJson(response, tokenResponse, 'private');
}

export async function connectFinish(
  ctx: BaseContext,
  input: ConnectFinishInput,
): Promise<readonly ConnectedAccount<MastodonCredentials>[]> {
  const pending = pendingState.safeParse(input.pending);
  if (!pending.success) throw permanent('pending_invalid');
  if (input.params.error !== undefined) throw permanent('authorization_denied');
  const code = input.params.code;
  if (code === undefined || code === '') throw permanent('code_missing');
  const origin = originOf(input.app);
  const host = new URL(origin).host;

  const token = await exchangeCode(ctx, {
    app: input.app,
    origin,
    redirectUri: input.redirectUri,
    code,
    verifier: pending.data.verifier,
  });
  if (token.token_type.toLowerCase() !== 'bearer') throw permanent('token_type_unsupported');
  const me = await callJson(ctx, {
    effect: 'none',
    url: apiUrl(origin, '/api/v1/accounts/verify_credentials'),
    schema: account,
    failure: 'verify_credentials_failed',
    init: { headers: { authorization: `Bearer ${token.access_token}` } },
  });
  const capabilities = await readCapabilities(ctx, origin);
  const name = me.display_name?.trim();
  const profileUrl = httpsUrl(me.url);
  return [
    {
      credentials: { accessToken: token.access_token },
      grantedScopes: (token.scope ?? '').split(' ').filter((scope) => scope !== ''),
      providerAccountId: `${me.id}@${host}`,
      accountKind: 'personal',
      handle: `@${me.username}@${host}`,
      displayName: name === undefined || name === '' ? me.username : name,
      ...(profileUrl === undefined ? {} : { profileUrl }),
      capabilities,
    },
  ];
}
