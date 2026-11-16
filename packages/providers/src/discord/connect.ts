import {
  type BaseContext,
  type ConnectedAccount,
  type ConnectFinishInput,
  type ConnectStart,
  type ConnectStartInput,
  isProviderFailure,
} from '@kronaut/core';
import * as z from 'zod';
import {
  channelUrl,
  DISCORD_API,
  discordFailure,
  isSuccess,
  snowflake,
} from '../_kit/discord/api.ts';
import { appSecret, authorizeUrl, exchangeCode, grantedScopes } from '../_kit/discord/oauth.ts';
import { readJson, send } from '../_kit/http.ts';
import { permanent } from '../_kit/meta-graph.ts';
import type { DiscordCredentials } from './webhook.ts';

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

function nonBlank(value: string | null | undefined): string | undefined {
  return value === null || value === undefined || value.trim() === '' ? undefined : value;
}

export async function connectStart(
  _ctx: BaseContext,
  input: ConnectStartInput,
): Promise<ConnectStart> {
  appSecret(input.app.clientSecret, 'client_secret_missing');
  return { authorizationUrl: authorizeUrl(input, { scope: SCOPES.join(' ') }), pending: {} };
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
  const token = await exchangeCode(ctx, input, tokenResponse);
  if (token.webhook === undefined) throw permanent('webhook_missing');
  const guild = await guildName(ctx, token.access_token, token.webhook.guild_id);
  return [account(token.webhook, grantedScopes(token.scope), guild)];
}
