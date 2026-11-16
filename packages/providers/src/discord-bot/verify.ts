import { isProviderFailure, type PublishContext, type VerifyOutcome } from '@kronaut/core';
import { Temporal } from 'temporal-polyfill';
import * as z from 'zod';
import { messageUrl, snowflake } from '../_kit/discord/api.ts';
import { messageState } from '../_kit/discord/publish.ts';
import { readJson } from '../_kit/http.ts';
import { botGet, channelMessagesUrl, type DiscordBotCredentials, messageNonce } from './bot.ts';
import { discordBotManifest } from './manifest.ts';
import type { Input } from './publish.ts';

const PAGE = 50;
const CLOCK_SKEW = Temporal.Duration.from({ minutes: 2 });
const WINDOW = Temporal.Duration.from({ milliseconds: discordBotManifest.verify.windowMs });

const messages = z.array(
  z.looseObject({
    id: snowflake,
    author: z.looseObject({ id: z.string() }),
    content: z.string().nullish(),
    nonce: z.union([z.string(), z.number()]).nullish(),
    timestamp: z.string(),
    attachments: z.array(z.unknown()).nullish(),
  }),
);
type Message = z.infer<typeof messages>[number];

function instantOf(value: string | undefined): Temporal.Instant | undefined {
  if (value === undefined) return undefined;
  try {
    return Temporal.Instant.from(value);
  } catch (error) {
    if (error instanceof RangeError) return undefined;
    throw error;
  }
}

function found({ guildId, channelId }: DiscordBotCredentials, id: string): VerifyOutcome {
  return { kind: 'found', remoteId: id, url: messageUrl(guildId, channelId, id) };
}

function matcher(input: Input, since: Temporal.Instant): (message: Message) => boolean {
  const nonce = messageNonce(input.destinationId);
  // One bot posts for every destination in the channel, so the same text proves nothing; only our nonce does.
  return (message) => {
    if (message.author.id !== input.credentials.botUserId) return false;
    if (message.nonce === undefined || message.nonce === null) return false;
    const at = instantOf(message.timestamp);
    if (at === undefined || Temporal.Instant.compare(at, since) < 0) return false;
    return String(message.nonce) === nonce;
  };
}

export async function verifyMessage(ctx: PublishContext, input: Input): Promise<VerifyOutcome> {
  const state = messageState.safeParse(input.state).data;
  if (state?.message !== undefined) return found(input.credentials, state.message.id);
  const sentAt = instantOf(state?.sentAt);
  if (sentAt === undefined || input.items.length !== 1) return { kind: 'inconclusive' };
  if (Temporal.Instant.compare(ctx.now(), sentAt.add(WINDOW)) > 0) return { kind: 'inconclusive' };
  const url = channelMessagesUrl(input.credentials.channelId);
  url.searchParams.set('limit', String(PAGE));
  try {
    const list = await readJson(await botGet(ctx, input.app, url, 'none'), messages, 'none');
    const match = list.find(matcher(input, sentAt.subtract(CLOCK_SKEW)));
    return match === undefined ? { kind: 'inconclusive' } : found(input.credentials, match.id);
  } catch (error) {
    if (isProviderFailure(error) && error.error.kind !== 'auth_revoked')
      return { kind: 'inconclusive' };
    throw error;
  }
}
