import { createHash } from 'node:crypto';
import type { BaseContext, ProviderApp, ProviderHttpResponse, StepEffect } from '@kronaut/core';
import * as z from 'zod';
import { DISCORD_API, discordFailure, isSuccess, snowflake } from '../_kit/discord/api.ts';
import { appSecret } from '../_kit/discord/oauth.ts';
import { send } from '../_kit/http.ts';

const NONCE_LENGTH = 25;

export const discordBotCredentials = z.object({
  guildId: snowflake,
  channelId: snowflake,
  botUserId: snowflake,
});
export type DiscordBotCredentials = z.infer<typeof discordBotCredentials>;

export function botHeaders(app: ProviderApp): Record<string, string> {
  return {
    authorization: `Bot ${appSecret(app.botToken, 'bot_token_missing')}`,
    'user-agent': `DiscordBot (${app.publicBaseUrl}, 1)`,
    accept: 'application/json',
  };
}

export function messageNonce(destinationId: string): string {
  return createHash('sha256')
    .update(destinationId, 'utf8')
    .digest('base64url')
    .slice(0, NONCE_LENGTH);
}

export function channelMessagesUrl(channelId: string): URL {
  return new URL(`${DISCORD_API}/channels/${channelId}/messages`);
}

export async function botGet(
  ctx: BaseContext,
  app: ProviderApp,
  url: string | URL,
  effect: StepEffect = 'private',
): Promise<ProviderHttpResponse> {
  const response = await send(ctx, effect, url, { headers: botHeaders(app) });
  if (!isSuccess(response.status)) throw await discordFailure(response, effect, ctx.now(), 'bot');
  return response;
}
