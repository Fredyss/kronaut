import { isProviderFailure } from '@kronaut/core';
import { describe, expect, it } from 'vitest';
import { type ScriptedExchange, scriptedHttp, testBaseContext } from '../_kit/testing.ts';
import { discordBotRuntime } from './runtime.ts';
import { APP, BOT_TOKEN, CREDENTIALS, MESSAGES } from './testing.ts';

async function analytics(exchanges: readonly ScriptedExchange[], remoteIds: readonly string[]) {
  if (discordBotRuntime.analytics === undefined) throw new Error('discord_bot reads analytics');
  const http = scriptedHttp(exchanges);
  const result = await discordBotRuntime
    .analytics(testBaseContext(http), {
      app: APP,
      account: { providerAccountId: CREDENTIALS.channelId },
      credentials: CREDENTIALS,
      remoteIds,
      postTypes: {},
    })
    .catch((failure: unknown) => {
      if (!isProviderFailure(failure)) throw failure;
      return { thrown: failure.error, message: failure.message };
    });
  http.assertDone();
  return { result, calls: http.calls };
}

describe('discord_bot analytics', () => {
  it('reads the channel message as the bot and sums its reactions', async () => {
    const reactions = [{ count: 4, count_details: { burst: 1, normal: 3 } }, { count: 1 }];
    const { result, calls } = await analytics(
      [{ url: `${MESSAGES}/7`, json: { id: '7', reactions } }],
      ['7'],
    );
    expect(result).toEqual({ posts: { '7': { reactions: 5 } }, apiVersion: 'v10' });
    expect(calls[0]?.headers.authorization).toBe(`Bot ${BOT_TOKEN}`);
    expect(calls[0]?.headers['user-agent']).toBe('DiscordBot (https://k.example.org, 1)');
  });

  it('ends a deleted message and keeps reading the rest', async () => {
    const { result } = await analytics(
      [
        { url: `${MESSAGES}/7`, status: 404, json: { code: 10_008 } },
        { url: `${MESSAGES}/8`, json: { id: '8', reactions: [] } },
      ],
      ['7', '8'],
    );
    expect(result).toEqual({
      posts: { '8': { reactions: 0 } },
      failed: { '7': { kind: 'permanent', code: 'not_found' } },
      apiVersion: 'v10',
    });
  });

  it.each([
    [{ status: 429, json: { retry_after: 1, global: true } }, { kind: 'rate_limited' }],
    [
      { status: 401, json: { code: 0 } },
      { kind: 'app_config', code: 'bot_token_invalid' },
    ],
  ])('stops the channel on %o, without the token', async (reply, thrown) => {
    const { result } = await analytics([{ url: `${MESSAGES}/7`, ...reply }], ['7', '8']);
    expect(result).toMatchObject({ thrown });
    expect(JSON.stringify(result)).not.toContain(BOT_TOKEN);
  });
});
