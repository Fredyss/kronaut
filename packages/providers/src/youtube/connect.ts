import type {
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
import { isSuccess, youtubeFailure } from './errors.ts';
import {
  AUTHORIZE_URL,
  appSecret,
  exchangeCode,
  SCOPES,
  scopesOf,
  type YoutubeCredentials,
} from './oauth.ts';

const CHANNELS_URL = 'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true';
const CHANNEL_URL = 'https://www.youtube.com/channel/';

const pendingState = z.object({ verifier: z.string().min(43).max(128) });

const channels = z.looseObject({
  items: z
    .array(
      z.looseObject({
        id: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),
        snippet: z.looseObject({
          title: z.string().optional(),
          customUrl: z.string().optional(),
        }),
      }),
    )
    .optional(),
});
type Channel = NonNullable<z.infer<typeof channels>['items']>[number];

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

async function listChannels(ctx: BaseContext, accessToken: string): Promise<readonly Channel[]> {
  const response = await send(ctx, 'none', CHANNELS_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!isSuccess(response.status)) throw await youtubeFailure(response, 'none', ctx.now());
  const { items } = await readJson(response, channels, 'none');
  return items ?? [];
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
  if (!SCOPES.every((scope) => grantedScopes.includes(scope))) throw permanent('scope_missing');
  const accessExpiresAt = ctx.now().add({ seconds: token.expires_in });
  const credentials = { accessToken: token.access_token, refreshToken: token.refresh_token };
  return (await listChannels(ctx, token.access_token)).map(({ id, snippet }) => {
    const title = snippet.title?.trim() ?? '';
    const handle = snippet.customUrl?.trim() ?? '';
    return {
      credentials,
      grantedScopes,
      accessExpiresAt,
      providerAccountId: id,
      accountKind: 'channel',
      displayName: title === '' ? id : title,
      ...(handle === '' ? {} : { handle }),
      profileUrl: `${CHANNEL_URL}${id}`,
    };
  });
}
