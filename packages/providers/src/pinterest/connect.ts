import type {
  BaseContext,
  ConnectedAccount,
  ConnectFinishInput,
  ConnectStart,
  ConnectStartInput,
} from '@kronaut/core';
import { permanent } from '../_kit/meta-graph.ts';
import { accountProfile, listPublicBoards, readUserAccount } from './boards.ts';
import {
  AUTHORIZE_URL,
  appSecret,
  exchangeCode,
  type PinterestCredentials,
  SCOPES,
} from './oauth.ts';

export async function connectStart(
  _ctx: BaseContext,
  input: ConnectStartInput,
): Promise<ConnectStart> {
  appSecret(input.app.clientSecret);
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set('client_id', input.app.clientId);
  url.searchParams.set('redirect_uri', input.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', SCOPES.join(','));
  url.searchParams.set('state', input.state);
  return { authorizationUrl: url.toString(), pending: {} };
}

function callbackCode(params: Readonly<Record<string, string>>): string {
  if (params.error !== undefined) throw permanent('authorization_denied');
  const code = params.code ?? '';
  if (code === '') throw permanent('code_missing');
  return code;
}

export async function connectFinish(
  ctx: BaseContext,
  input: ConnectFinishInput,
): Promise<readonly ConnectedAccount<PinterestCredentials>[]> {
  const issued = await exchangeCode(ctx, {
    clientId: input.app.clientId,
    clientSecret: appSecret(input.app.clientSecret),
    code: callbackCode(input.params),
    redirectUri: input.redirectUri,
  });
  if (!SCOPES.every((scope) => issued.grantedScopes.includes(scope)))
    throw permanent('scope_missing');
  const token = issued.credentials.accessToken;
  const user = await readUserAccount(ctx, token);
  const boards = await listPublicBoards(ctx, token);
  return [
    {
      ...issued,
      providerAccountId: user.id,
      accountKind: 'account',
      ...accountProfile(user),
      subjectId: user.id,
      capabilities: { boards },
    },
  ];
}
