import { describe, expect, it } from 'vitest';
import { TEST_NOW } from '../_kit/testing.ts';
import { messageNonce } from './bot.ts';
import {
  BOT_TOKEN,
  CREDENTIALS,
  input,
  MESSAGE_ID,
  MESSAGES,
  PERMALINK,
  run,
  SENT_AT,
} from './testing.ts';

const RECENT = `${MESSAGES}?limit=50`;
const NONCE = messageNonce(input().destinationId);

function message(id: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    author: { id: CREDENTIALS.botUserId },
    content: 'Hello',
    timestamp: TEST_NOW.add({ seconds: 5 }).toString(),
    attachments: [],
    ...extra,
  };
}

async function verify(list: unknown, status = 200, minutes = 1) {
  return await run('verify', [{ url: RECENT, status, json: list }], {
    state: { sentAt: SENT_AT },
    minutes,
  });
}

describe('discord_bot verify', () => {
  it('finds the bot message carrying our nonce', async () => {
    const list = [message('1', { nonce: 'other' }), message(MESSAGE_ID, { nonce: NONCE })];
    const { result, calls } = await verify(list);
    expect(result).toEqual({ kind: 'found', remoteId: MESSAGE_ID, url: PERMALINK });
    expect(calls[0]?.headers.authorization).toBe(`Bot ${BOT_TOKEN}`);
  });

  it('never claims a message by the same text alone, since every destination posts as one bot', async () => {
    const list = [message('1', { author: { id: '42' }, nonce: NONCE }), message(MESSAGE_ID)];
    expect((await verify(list)).result).toEqual({ kind: 'inconclusive' });
  });

  it('stays inconclusive without a match, outside the window or on an error', async () => {
    expect((await verify([message('1', { content: 'Other' })])).result).toEqual({
      kind: 'inconclusive',
    });
    expect((await verify([], 500)).result).toEqual({ kind: 'inconclusive' });
    const late = await run('verify', [], { state: { sentAt: SENT_AT }, minutes: 61 });
    expect(late.result).toEqual({ kind: 'inconclusive' });
  });

  it('returns the checkpointed message without a call', async () => {
    const saved = await run('verify', [], { state: { message: { id: MESSAGE_ID } } });
    expect(saved.result).toEqual({ kind: 'found', remoteId: MESSAGE_ID, url: PERMALINK });
  });
});
