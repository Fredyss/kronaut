import type { BaseContext, RevokeInput } from '@kronaut/core';
import * as z from 'zod';
import { DISCORD_API, discordFailure, isSuccess, snowflake } from '../_kit/discord/api.ts';
import { send } from '../_kit/http.ts';

export const discordCredentials = z.object({
  webhookId: snowflake,
  webhookToken: z.string().min(1),
  guildId: snowflake,
  channelId: snowflake,
});
export type DiscordCredentials = z.infer<typeof discordCredentials>;

export function webhookUrl(credentials: DiscordCredentials): URL {
  const { webhookId, webhookToken } = credentials;
  return new URL(`${DISCORD_API}/webhooks/${webhookId}/${encodeURIComponent(webhookToken)}`);
}

export async function deleteWebhook(
  ctx: BaseContext,
  { credentials }: RevokeInput<DiscordCredentials>,
): Promise<void> {
  const response = await send(ctx, 'private', webhookUrl(credentials), { method: 'DELETE' });
  if (isSuccess(response.status) || response.status === 404) return;
  throw await discordFailure(response, 'private', ctx.now());
}
