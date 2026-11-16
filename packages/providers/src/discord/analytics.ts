import type { AnalyticsInput, AnalyticsResult, BaseContext } from '@kronaut/core';
import { messageAnalytics } from '../_kit/discord/analytics.ts';
import { discordManifest } from './manifest.ts';
import { type DiscordCredentials, webhookUrl } from './webhook.ts';

export function webhookAnalytics(
  ctx: BaseContext,
  input: AnalyticsInput<DiscordCredentials>,
): Promise<AnalyticsResult> {
  const read = (messageId: string) => {
    const url = webhookUrl(input.credentials);
    url.pathname += `/messages/${messageId}`;
    return { url, headers: { accept: 'application/json' }, auth: 'webhook' } as const;
  };
  return messageAnalytics(ctx, input.remoteIds, read, discordManifest.apiVersion.version);
}
