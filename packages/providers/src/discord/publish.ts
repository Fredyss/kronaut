import type { PublishContext, PublishInput, PublishOutcome } from '@kronaut/core';
import type { DiscordMessageSettings } from '../_kit/discord/message-spec.ts';
import { publishDiscordMessage } from '../_kit/discord/publish.ts';
import { type DiscordCredentials, webhookUrl } from './webhook.ts';

type Input = PublishInput<DiscordCredentials, DiscordMessageSettings>;

export async function publishMessage(ctx: PublishContext, input: Input): Promise<PublishOutcome> {
  return await publishDiscordMessage(ctx, input, () => {
    const url = webhookUrl(input.credentials);
    url.searchParams.set('wait', 'true');
    return { url, headers: { accept: 'application/json' }, auth: 'webhook' };
  });
}
