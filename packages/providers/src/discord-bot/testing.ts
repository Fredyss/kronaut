import {
  isProviderFailure,
  type ProviderApp,
  type ProviderError,
  type ProviderLogger,
  type PublishInput,
} from '@kronaut/core';
import type { DiscordMessageSettings } from '../_kit/discord/message-spec.ts';
import {
  type ScriptedExchange,
  scriptedHttp,
  TEST_NOW,
  testPublishContext,
} from '../_kit/testing.ts';
import type { DiscordBotCredentials } from './bot.ts';
import { discordBotRuntime } from './runtime.ts';

export const BOT_TOKEN = 'CANARY_discord_bot_token_7c2e';
export const APP: ProviderApp = {
  clientId: '1234567890123456789',
  clientSecret: 'CANARY_discord_bot_client_secret',
  botToken: BOT_TOKEN,
  publicBaseUrl: 'https://k.example.org',
};
export const CREDENTIALS: DiscordBotCredentials = {
  guildId: '112233445566778899',
  channelId: '998877665544332211',
  botUserId: '554433221100998877',
};
export const MESSAGES = `https://discord.com/api/v10/channels/${CREDENTIALS.channelId}/messages`;
export const MESSAGE_ID = '1300000000000000001';
export const PERMALINK = `https://discord.com/channels/${CREDENTIALS.guildId}/${CREDENTIALS.channelId}/${MESSAGE_ID}`;
export const SENT_AT = TEST_NOW.toString();

export interface RunOptions {
  readonly text?: string;
  readonly destinationId?: string;
  readonly state?: Record<string, unknown>;
  readonly app?: ProviderApp;
  readonly minutes?: number;
}

export function input(
  options: RunOptions = {},
): PublishInput<DiscordBotCredentials, DiscordMessageSettings> {
  return {
    destinationId: options.destinationId ?? '0193a1b2-c3d4-7e5f-8a9b-0c1d2e3f4a5b',
    attemptNo: 1,
    postType: 'message',
    account: { providerAccountId: CREDENTIALS.channelId },
    credentials: CREDENTIALS,
    app: options.app ?? APP,
    settings: { silent: false, pingEveryone: false },
    items: [{ position: 0, role: 'main', text: options.text ?? 'Hello', media: [] }],
    state: options.state ?? {},
  };
}

type Step = 'publish' | 'verify';

export async function run(
  step: Step,
  exchanges: readonly ScriptedExchange[],
  options: RunOptions = {},
) {
  const http = scriptedHttp(exchanges);
  const context = testPublishContext(http, {}, TEST_NOW.add({ minutes: options.minutes ?? 0 }));
  const logged: unknown[] = [];
  const record = (fields: Record<string, unknown>, msg: string) => logged.push({ fields, msg });
  const logger: ProviderLogger = { debug: record, info: record, warn: record, error: record };
  const ctx = { ...context.ctx, logger };
  const verify = discordBotRuntime.verify;
  if (verify === undefined) throw new Error('discord_bot verifies');
  let error: ProviderError | undefined;
  const call = step === 'publish' ? discordBotRuntime.publish : verify;
  const result = await call(ctx, input(options)).catch((failure: unknown) => {
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
