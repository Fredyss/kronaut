import {
  type BaseContext,
  type ConnectedAccount,
  type ConnectFinishInput,
  type ConnectStart,
  type ConnectStartInput,
  isProviderFailure,
  ProviderFailure,
} from '@kronaut/core';
import * as z from 'zod';
import {
  channelUrl,
  DISCORD_API,
  discordFailure,
  isSuccess,
  snowflake,
} from '../_kit/discord/api.ts';
import { readJson, send, tryJson } from '../_kit/http.ts';
import { permanent } from '../_kit/meta-graph.ts';
import type { DiscordCredentials } from './webhook.ts';

const AUTHORIZE_URL = 'https://discord.com/oauth2/authorize';
const TOKEN_URL = 'https://discord.com/api/oauth2/token';
const SCOPES = ['webhook.incoming', 'guilds'] as const;

const tokenResponse = z.looseObject({
  access_token: z.string().min(1),
  scope: z.string().optional(),
  webhook: z
    .looseObject({
      id: snowflake,
      token: z.string().min(1),
      channel_id: snowflake,
      guild_id: snowflake,
      name: z.string().nullish(),
    })
    .optional(),
});
type Webhook = NonNullable<z.infer<typeof tokenResponse>['webhook']>;

const guilds = z.array(z.looseObject({ id: z.string(), name: z.string() }));
const oauthError = z.looseObject({ error: z.string() });

function nonBlank(value: string | null | undefined): string | undefined {
  return value === null || value === undefined || value.trim() === '' ? undefined : value;
}

function clientSecret(secret: string | undefined): string {
  if (secret !== undefined && secret !== '') return secret;
  throw new ProviderFailure({ kind: 'app_config', code: 'client_secret_missing' });
}

export async function connectStart(
  _ctx: BaseContext,
  input: ConnectStartInput,
): Promise<ConnectStart> {
  clientSecret(input.app.clientSecret);
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', input.app.clientId);
  url.searchParams.set('scope', SCOPES.join(' '));
  url.searchParams.set('state', input.state);
  url.searchParams.set('redirect_uri', input.redirectUri);
  return { authorizationUrl: url.toString(), pending: {} };
}

async function exchangeCode(ctx: BaseContext, input: ConnectFinishInput) {
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
      client_secret: clientSecret(input.app.clientSecret),
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
  return readJson(response, tokenResponse, 'private');
}

async function guildName(
  ctx: BaseContext,
  accessToken: string,
  guildId: string,
): Promise<string | undefined> {
  try {
    const response = await send(ctx, 'private', `${DISCORD_API}/users/@me/guilds?limit=200`, {
      headers: { authorization: `Bearer ${accessToken}`, accept: 'application/json' },
    });
    if (!isSuccess(response.status)) throw await discordFailure(response, 'private', ctx.now());
    return nonBlank(
      (await readJson(response, guilds, 'private')).find((g) => g.id === guildId)?.name,
    );
  } catch (error) {
    if (!isProviderFailure(error)) throw error;
    // The webhook already exists, so a failed name lookup must not fail the connect.
    ctx.logger.warn({ reason: error.error.kind }, 'discord guild lookup failed');
    return undefined;
  }
}

function account(
  webhook: Webhook,
  grantedScopes: readonly string[],
  guild: string | undefined,
): ConnectedAccount<DiscordCredentials> {
  const handle = nonBlank(webhook.name);
  return {
    credentials: {
      webhookId: webhook.id,
      webhookToken: webhook.token,
      guildId: webhook.guild_id,
      channelId: webhook.channel_id,
    },
    grantedScopes,
    providerAccountId: webhook.channel_id,
    accountKind: 'channel',
    displayName: guild ?? handle ?? webhook.channel_id,
    ...(handle === undefined ? {} : { handle }),
    profileUrl: channelUrl(webhook.guild_id, webhook.channel_id),
  };
}

export async function connectFinish(
  ctx: BaseContext,
  input: ConnectFinishInput,
): Promise<readonly ConnectedAccount<DiscordCredentials>[]> {
  const token = await exchangeCode(ctx, input);
  const grantedScopes = (token.scope ?? '').split(' ').filter((scope) => scope !== '');
  if (token.webhook === undefined) throw permanent('webhook_missing');
  const guild = await guildName(ctx, token.access_token, token.webhook.guild_id);
  return [account(token.webhook, grantedScopes, guild)];
}
