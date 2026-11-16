import type {
  BaseContext,
  ConnectedAccount,
  ConnectFinishInput,
  ConnectStart,
  ConnectStartInput,
} from '@kronaut/core';
import * as z from 'zod';
import { permanent } from '../_kit/meta-graph.ts';
import { pkcePair } from '../_kit/pkce.ts';
import { channelProfile, listChannels } from './channel.ts';
import {
  AUTHORIZE_URL,
  appSecret,
  exchangeCode,
  REQUIRED_SCOPES,
  refreshExpiry,
  SCOPES,
  scopesOf,
  subjectOf,
  type YoutubeCredentials,
} from './oauth.ts';

const pendingState = z.object({ verifier: z.string().min(43).max(128) });

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
  url.searchParams.set('state', input.state);
  url.searchParams.set('scope', SCOPES.join(' '));
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
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

export async function connectFinish(
  ctx: BaseContext,
  input: ConnectFinishInput,
): Promise<readonly ConnectedAccount<YoutubeCredentials>[]> {
  const pending = pendingState.safeParse(input.pending);
  if (!pending.success) throw permanent('pending_invalid');
  const code = callbackCode(input.params);
  const token = await exchangeCode(ctx, {
    clientId: input.app.clientId,
    clientSecret: appSecret(input.app.clientSecret),
    code,
    redirectUri: input.redirectUri,
    verifier: pending.data.verifier,
  });
  if (token.refresh_token === undefined) throw permanent('refresh_token_missing');
  const grantedScopes = scopesOf(token.scope);
  if (!REQUIRED_SCOPES.every((scope) => grantedScopes.includes(scope))) {
    throw permanent('scope_missing');
  }
  const accessExpiresAt = ctx.now().add({ seconds: token.expires_in });
  const refreshExpiresAt = refreshExpiry(ctx.now(), token);
  const credentials = { accessToken: token.access_token, refreshToken: token.refresh_token };
  const subject = subjectOf(token.id_token);
  return (await listChannels(ctx, token.access_token, 'snippet')).map((channel) => ({
    credentials,
    grantedScopes,
    accessExpiresAt,
    ...refreshExpiresAt,
    providerAccountId: channel.id,
    accountKind: 'channel',
    ...(subject === undefined ? {} : { subjectId: subject }),
    ...channelProfile(channel),
  }));
}
