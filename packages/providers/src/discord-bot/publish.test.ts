import { describe, expect, it } from 'vitest';
import { assertPublicSendOrder } from '../_kit/testing.ts';
import { discordBotManifest } from './manifest.ts';
import { APP, BOT_TOKEN, bodyText, MESSAGE_ID, MESSAGES, PERMALINK, run } from './testing.ts';

const sent = { method: 'POST', url: MESSAGES, json: { id: MESSAGE_ID, channel_id: '1' } };

async function nonceOf(destinationId: string): Promise<unknown> {
  const { calls } = await run('publish', [sent], { destinationId });
  return JSON.parse(bodyText(calls[0]?.body)).nonce;
}

describe('discord_bot publish', () => {
  it('sends as the bot with a nonce the server dedupes on', async () => {
    const result = await run('publish', [sent]);
    expect(result.result).toEqual({ kind: 'published', remoteId: MESSAGE_ID, url: PERMALINK });
    const [call] = result.calls;
    expect(call?.headers.authorization).toBe(`Bot ${BOT_TOKEN}`);
    expect(call?.headers['content-type']).toBe('application/json');
    const body = JSON.parse(bodyText(call?.body));
    expect(body).toMatchObject({ content: 'Hello', enforce_nonce: true });
    expect(body.nonce).toMatch(/^[A-Za-z0-9_-]{25}$/);
    assertPublicSendOrder(result.events, discordBotManifest);
    expect(result.checkpoints.at(-1)).toMatchObject({ message: { id: MESSAGE_ID } });
  });

  it('derives the same nonce for the same destination and another for another', async () => {
    const first = await nonceOf('0193a1b2-0000-7000-8000-000000000001');
    expect(await nonceOf('0193a1b2-0000-7000-8000-000000000001')).toBe(first);
    expect(await nonceOf('0193a1b2-0000-7000-8000-000000000002')).not.toBe(first);
  });

  it('fails as an app incident without a bot token, before any step', async () => {
    const { botToken: _token, ...withoutToken } = APP;
    const result = await run('publish', [], { app: withoutToken });
    expect(result.error).toEqual({ kind: 'app_config', code: 'bot_token_missing' });
    expect(result.events).toEqual([]);
  });

  it.each([
    [403, 50_013, { kind: 'permanent', code: 'missing_permissions', detail: '403/50013' }],
    [403, 50_001, { kind: 'permanent', code: 'missing_access', detail: '403/50001' }],
    [404, 10_003, { kind: 'auth_revoked' }],
    [401, 0, { kind: 'app_config', code: 'bot_token_invalid' }],
  ])('maps %i/%i', async (status, code, expected) => {
    const failure = { method: 'POST', url: MESSAGES, status, json: { code, message: 'no' } };
    const result = await run('publish', [failure]);
    expect(result.error).toEqual(expected);
  });

  it('maps a global 429 to the app scope', async () => {
    const limited = {
      method: 'POST',
      url: MESSAGES,
      status: 429,
      json: { retry_after: 1, global: true },
    };
    expect((await run('publish', [limited])).error).toMatchObject({
      kind: 'rate_limited',
      scope: 'app',
    });
  });

  it('never puts the bot token in errors or logs', async () => {
    const failures = [
      { method: 'POST', url: MESSAGES, status: 403, json: { code: 50_013 } },
      { method: 'POST', url: MESSAGES, status: 502, text: 'bad gateway' },
      { method: 'POST', url: MESSAGES, json: { nope: true } },
    ];
    for (const failure of failures) {
      const result = await run('publish', [failure]);
      expect(result.error).toBeDefined();
      const seen = JSON.stringify({ error: result.error, logged: result.logged });
      expect(seen).not.toContain(BOT_TOKEN);
    }
  });
});
