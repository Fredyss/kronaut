import type { AnalyticsInput, AnalyticsResult, BaseContext } from '@kronaut/core';
import { messageAnalytics } from '../_kit/discord/analytics.ts';
import { botHeaders, channelMessagesUrl, type DiscordBotCredentials } from './bot.ts';
import { discordBotManifest } from './manifest.ts';

export function botAnalytics(
  ctx: BaseContext,
  input: AnalyticsInput<DiscordBotCredentials>,
): Promise<AnalyticsResult> {
  const read = (messageId: string) => {
    const url = channelMessagesUrl(input.credentials.channelId);
    url.pathname += `/${messageId}`;
    return { url, headers: botHeaders(input.app), auth: 'bot' } as const;
  };
  return messageAnalytics(ctx, input.remoteIds, read, discordBotManifest.apiVersion.version);
}
