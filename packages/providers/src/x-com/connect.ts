import type {
  AccountProfile,
  BaseContext,
  ConnectedAccount,
  ConnectFinishInput,
  ConnectStart,
  ConnectStartInput,
} from '@kronaut/core';
import * as z from 'zod';
import { readJson, send } from '../_kit/http.ts';
import { permanent } from '../_kit/meta-graph.ts';
import { pkcePair } from '../_kit/pkce.ts';
import { isSuccess, xFailure } from './errors.ts';
import {
  API_BASE,
  AUTHORIZE_URL,
  appSecret,
  exchangeCode,
  SCOPES,
  type XCredentials,
} from './oauth.ts';

export const X_ID = /^\d{1,19}$/;
const USERNAME = /^[A-Za-z0-9_]{1,50}$/;

const pendingState = z.object({ verifier: z.string().min(43).max(128) });
const me = z.looseObject({
  data: z.looseObject({
    id: z.string().regex(X_ID),
    username: z.string().regex(USERNAME),
    name: z.string().optional(),
    public_metrics: z
      .looseObject({ followers_count: z.unknown().optional() })
      .optional()
      .catch(undefined),
  }),
});
type Me = z.infer<typeof me>['data'];

export async function connectStart(
  _ctx: BaseContext,
  input: ConnectStartInput,
): Promise<ConnectStart> {
  appSecret(input.app.clientSecret);
  const { verifier, challenge } = pkcePair();
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', input.app.clientId);
  url.searchParams.set('redirect_uri', input.redirectUri);
  url.searchParams.set('scope', SCOPES.join(' '));
  url.searchParams.set('state', input.state);
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  return { authorizationUrl: url.toString(), pending: { verifier } };
}

function callbackCode(params: Readonly<Record<string, string>>): string {
  if (params.error !== undefined) throw permanent('authorization_denied');
  const code = params.code ?? '';
  if (code === '') throw permanent('code_missing');
  return code;
}

export async function readMe(ctx: BaseContext, token: string, query = ''): Promise<Me> {
  const response = await send(ctx, 'none', `${API_BASE}/users/me${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!isSuccess(response.status)) throw await xFailure(response, 'none', ctx.now());
  return (await readJson(response, me, 'none')).data;
}

export function profileOf(user: Me): Required<AccountProfile> {
  const name = user.name?.normalize('NFC').trim() ?? '';
  return {
    displayName: name === '' ? user.username : name,
    handle: user.username,
    profileUrl: `https://x.com/${user.username}`,
  };
}

export async function connectFinish(
  ctx: BaseContext,
  input: ConnectFinishInput,
): Promise<readonly ConnectedAccount<XCredentials>[]> {
  const pending = pendingState.safeParse(input.pending);
  if (!pending.success) throw permanent('pending_invalid');
  const issued = await exchangeCode(ctx, {
    clientId: input.app.clientId,
    clientSecret: appSecret(input.app.clientSecret),
    code: callbackCode(input.params),
    redirectUri: input.redirectUri,
    verifier: pending.data.verifier,
  });
  if (!SCOPES.every((scope) => issued.grantedScopes.includes(scope)))
    throw permanent('scope_missing');
  const user = await readMe(ctx, issued.credentials.accessToken);
  return [
    {
      ...issued,
      providerAccountId: user.id,
      accountKind: 'account',
      ...profileOf(user),
      subjectId: user.id,
    },
  ];
}
