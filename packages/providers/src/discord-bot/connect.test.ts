import { isProviderFailure, type ProviderApp } from '@kronaut/core';
import { describe, expect, it } from 'vitest';
import { type ScriptedExchange, scriptedHttp, testBaseContext } from '../_kit/testing.ts';
import { discordBotManifest } from './manifest.ts';
import { discordBotRuntime } from './runtime.ts';
import { APP, BOT_TOKEN, CREDENTIALS } from './testing.ts';

const REDIRECT = 'https://k.example.org/v1/oauth/discord_bot/callback';
const TOKEN_URL = 'https://discord.com/api/oauth2/token';
const ME = 'https://discord.com/api/v10/users/@me';
const CHANNELS = `https://discord.com/api/v10/guilds/${CREDENTIALS.guildId}/channels`;

const token = (extra: Record<string, unknown> = {}): ScriptedExchange => ({
  method: 'POST',
  url: TOKEN_URL,
  json: {
    access_token: 'CANARY_discord_user_access',
    refresh_token: 'CANARY_discord_user_refresh',
    scope: 'bot',
    token_type: 'Bearer',
    guild: { id: CREDENTIALS.guildId, name: 'Ada Lounge' },
    ...extra,
  },
});
const me: ScriptedExchange = { url: ME, json: { id: CREDENTIALS.botUserId, bot: true } };
const channels = (list: unknown, status = 200): ScriptedExchange => ({
  url: CHANNELS,
  status,
  json: list,
});

async function finish(
  exchanges: readonly ScriptedExchange[],
  params: Record<string, string> = { code: 'c1', state: 's' },
  app: ProviderApp = APP,
) {
  const http = scriptedHttp(exchanges);
  const outcome = await discordBotRuntime
    .connectFinish(testBaseContext(http), { app, redirectUri: REDIRECT, pending: {}, params })
    .then(
      (accounts) => ({ accounts, error: undefined }),
      (error: unknown) => {
        if (isProviderFailure(error)) return { accounts: undefined, error: error.error };
        throw error;
      },
    );
  http.assertDone();
  return { ...outcome, calls: http.calls };
}

describe('discord_bot connect', () => {
  it('installs the bot with send, attach and read-history permissions', async () => {
    const start = await discordBotRuntime.connectStart(testBaseContext(scriptedHttp([])), {
      app: APP,
      redirectUri: REDIRECT,
      state: 'state-1',
    });
    const url = new URL(start.authorizationUrl);
    expect(url.origin + url.pathname).toBe('https://discord.com/oauth2/authorize');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      response_type: 'code',
      client_id: APP.clientId,
      scope: 'bot',
      permissions: '248832',
      state: 'state-1',
      redirect_uri: REDIRECT,
    });
  });

  it.each([
    ['client secret', { clientSecret: '' }, 'client_secret_missing'],
    ['bot token', { botToken: '' }, 'bot_token_missing'],
  ])('refuses to start without the %s', async (_name, app, code) => {
    const start = discordBotRuntime.connectStart(testBaseContext(scriptedHttp([])), {
      app: { ...APP, ...app },
      redirectUri: REDIRECT,
      state: 's',
    });
    await expect(start).rejects.toMatchObject({ error: { kind: 'app_config', code } });
  });

  it("offers the exchange's server's text and announcement channels by position, never the hint", async () => {
    const list = [
      { id: '30', type: 0, name: 'news', position: 2 },
      { id: '40', type: 2, name: 'Voice', position: 0 },
      { id: '50', type: 4, name: 'Category', position: 0 },
      { id: '60', type: 5, name: 'announcements', position: 1 },
      { id: '9', type: 0, name: 'general', position: 1 },
      { id: '70', type: 15, name: 'forum', position: 0 },
    ];
    const hint = { code: 'c1', state: 's', guild_id: '1', permissions: '8' };
    const { accounts, calls } = await finish([token(), me, channels(list)], hint);
    expect(accounts?.map((account) => account.providerAccountId)).toEqual(['9', '60', '30']);
    expect(accounts?.[0]).toEqual({
      credentials: { ...CREDENTIALS, channelId: '9' },
      grantedScopes: ['bot'],
      providerAccountId: '9',
      accountKind: 'channel',
      displayName: '#general',
      handle: 'Ada Lounge',
      profileUrl: `https://discord.com/channels/${CREDENTIALS.guildId}/9`,
    });
    expect(calls.slice(1).map((call) => call.headers.authorization)).toEqual([
      `Bot ${BOT_TOKEN}`,
      `Bot ${BOT_TOKEN}`,
    ]);
    expect(calls[1]?.headers['user-agent']).toBe('DiscordBot (https://k.example.org, 1)');
  });

  it('keeps only ids in the account credentials, so Kronaut may pick among them', async () => {
    expect(discordBotManifest.auth.connectPicker).toBe('kronaut');
    const { accounts } = await finish([token(), me, channels([{ id: '9', type: 0, name: 'a' }])]);
    for (const account of accounts ?? []) {
      expect(Object.keys(account.credentials).sort()).toEqual([
        'botUserId',
        'channelId',
        'guildId',
      ]);
      expect(JSON.stringify(account)).not.toMatch(/CANARY/);
    }
  });

  it('returns no accounts for a server without a postable channel', async () => {
    const { accounts } = await finish([token(), me, channels([{ id: '40', type: 2 }])]);
    expect(accounts).toEqual([]);
  });

  it('fails without a guild in the token response', async () => {
    const { error } = await finish([token({ guild: undefined })]);
    expect(error).toEqual({ kind: 'permanent', code: 'guild_missing' });
  });

  it('flags a rejected bot token as an app incident', async () => {
    const rejected = { url: ME, status: 401, json: { code: 0, message: '401: Unauthorized' } };
    const { error } = await finish([token(), rejected]);
    expect(error).toEqual({ kind: 'app_config', code: 'bot_token_invalid' });
    expect(JSON.stringify(error)).not.toContain(BOT_TOKEN);
  });
});
