import {
  isProviderFailure,
  type MediaRef,
  type ProviderError,
  type ProviderLogger,
  type PublishInput,
} from '@kronaut/core';
import type { DiscordMessageSettings } from '../_kit/discord/message-spec.ts';
import { type ScriptedExchange, scriptedHttp, testPublishContext } from '../_kit/testing.ts';
import { discordRuntime } from './runtime.ts';
import type { DiscordCredentials } from './webhook.ts';

export const WEBHOOK_TOKEN = 'CANARY_discord_webhook_token_3f9a';
export const CREDENTIALS: DiscordCredentials = {
  webhookId: '223344556677889900',
  webhookToken: WEBHOOK_TOKEN,
  guildId: '112233445566778899',
  channelId: '998877665544332211',
};
export const WEBHOOK = `https://discord.com/api/v10/webhooks/${CREDENTIALS.webhookId}/${WEBHOOK_TOKEN}`;
export const EXECUTE = `${WEBHOOK}?wait=true`;
export const MESSAGE_ID = '1300000000000000001';

export function image(id: string, extra: Partial<MediaRef> = {}): MediaRef {
  return { id, sha256: 'b'.repeat(64), mime: 'image/png', bytes: 4, aiGenerated: false, ...extra };
}

export interface PublishOptions {
  readonly text?: string;
  readonly media?: readonly MediaRef[];
  readonly settings?: Partial<DiscordMessageSettings>;
  readonly state?: Record<string, unknown>;
}

function input(options: PublishOptions): PublishInput<DiscordCredentials, DiscordMessageSettings> {
  return {
    destinationId: 'dest-1',
    attemptNo: 1,
    postType: 'message',
    account: { providerAccountId: CREDENTIALS.channelId },
    credentials: CREDENTIALS,
    app: { clientId: '1234567890', clientSecret: 's', publicBaseUrl: 'https://k.example.org' },
    settings: { silent: false, pingEveryone: false, ...options.settings },
    items: [
      { position: 0, role: 'main', text: options.text ?? 'Hello', media: options.media ?? [] },
    ],
    state: options.state ?? {},
  };
}

export async function runPublish(
  exchanges: readonly ScriptedExchange[],
  options: PublishOptions = {},
) {
  const http = scriptedHttp(exchanges);
  const files = Object.fromEntries(
    (options.media ?? []).map((ref) => [
      ref.id,
      { url: `https://media.example.org/${ref.id}`, bytes: new TextEncoder().encode(ref.id) },
    ]),
  );
  const context = testPublishContext(http, files);
  const logged: unknown[] = [];
  const record = (fields: Record<string, unknown>, msg: string) => logged.push({ fields, msg });
  const logger: ProviderLogger = { debug: record, info: record, warn: record, error: record };
  let error: ProviderError | undefined;
  const result = await discordRuntime
    .publish({ ...context.ctx, logger }, input(options))
    .catch((failure: unknown) => {
      if (!isProviderFailure(failure)) throw failure;
      error = failure.error;
      return undefined;
    });
  http.assertDone();
  return { result, error, logged, calls: http.calls, ...context };
}

export function bodyText(body: string | Uint8Array | undefined): string {
  return typeof body === 'string' ? body : new TextDecoder().decode(body);
}
