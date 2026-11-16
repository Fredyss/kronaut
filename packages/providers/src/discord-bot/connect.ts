import type {
  BaseContext,
  ConnectedAccount,
  ConnectFinishInput,
  ConnectStart,
  ConnectStartInput,
} from '@kronaut/core';
import * as z from 'zod';
import { channelUrl, DISCORD_API, snowflake } from '../_kit/discord/api.ts';
import { appSecret, authorizeUrl, exchangeCode, grantedScopes } from '../_kit/discord/oauth.ts';
import { readJson } from '../_kit/http.ts';
import { permanent } from '../_kit/meta-graph.ts';
import { botGet, type DiscordBotCredentials } from './bot.ts';

const VIEW_CHANNEL = 1 << 10;
const SEND_MESSAGES = 1 << 11;
const EMBED_LINKS = 1 << 14;
const ATTACH_FILES = 1 << 15;
const READ_MESSAGE_HISTORY = 1 << 16;
const MENTION_EVERYONE = 1 << 17;
const PERMISSIONS =
  VIEW_CHANNEL |
  SEND_MESSAGES |
  EMBED_LINKS |
  ATTACH_FILES |
  READ_MESSAGE_HISTORY |
  MENTION_EVERYONE;
const GUILD_TEXT = 0;
const GUILD_ANNOUNCEMENT = 5;
const POSTABLE: ReadonlySet<number> = new Set([GUILD_TEXT, GUILD_ANNOUNCEMENT]);

const tokenResponse = z.looseObject({
  scope: z.string().optional(),
  guild: z.looseObject({ id: snowflake, name: z.string() }).optional(),
});
const botUser = z.looseObject({ id: snowflake });
const channels = z.array(
  z.looseObject({
    id: snowflake,
    type: z.number().int(),
    name: z.string().nullish(),
    position: z.number().int().nullish(),
  }),
);
type Channel = z.infer<typeof channels>[number];

export async function connectStart(
  _ctx: BaseContext,
  input: ConnectStartInput,
): Promise<ConnectStart> {
  appSecret(input.app.clientSecret, 'client_secret_missing');
  appSecret(input.app.botToken, 'bot_token_missing');
  const extra = { scope: 'bot', permissions: String(PERMISSIONS) };
  return { authorizationUrl: authorizeUrl(input, extra), pending: {} };
}

function snowflakeOrder(a: string, b: string): number {
  return a.length - b.length || (a < b ? -1 : a > b ? 1 : 0);
}

function byPosition(a: Channel, b: Channel): number {
  return (a.position ?? 0) - (b.position ?? 0) || snowflakeOrder(a.id, b.id);
}

export async function connectFinish(
  ctx: BaseContext,
  input: ConnectFinishInput,
): Promise<readonly ConnectedAccount<DiscordBotCredentials>[]> {
  const token = await exchangeCode(ctx, input, tokenResponse);
  // The redirect's guild_id is only a hint; the exchange's guild is where the bot was added.
  const { guild } = token;
  if (guild === undefined) throw permanent('guild_missing');
  const { app } = input;
  const bot = await readJson(
    await botGet(ctx, app, `${DISCORD_API}/users/@me`),
    botUser,
    'private',
  );
  const listed = await readJson(
    await botGet(ctx, app, `${DISCORD_API}/guilds/${guild.id}/channels`),
    channels,
    'private',
  );
  const scopes = grantedScopes(token.scope);
  return listed
    .filter((channel) => POSTABLE.has(channel.type))
    .sort(byPosition)
    .map((channel) => ({
      credentials: { guildId: guild.id, channelId: channel.id, botUserId: bot.id },
      grantedScopes: scopes,
      providerAccountId: channel.id,
      accountKind: 'channel',
      displayName: `#${channel.name ?? channel.id}`,
      ...(guild.name.trim() === '' ? {} : { handle: guild.name }),
      profileUrl: channelUrl(guild.id, channel.id),
    }));
}
