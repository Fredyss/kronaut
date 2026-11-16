import { isProviderFailure, type ProviderApp } from '@kronaut/core';
import { describe, expect, it } from 'vitest';
import {
  onlyAccount,
  type ScriptedExchange,
  scriptedHttp,
  testBaseContext,
} from '../_kit/testing.ts';
import { discordRuntime } from './runtime.ts';
import { CREDENTIALS, WEBHOOK, WEBHOOK_TOKEN } from './testing.ts';

const APP: ProviderApp = {
  clientId: '1234567890123456789',
  clientSecret: 'CANARY_discord_client_secret',
  publicBaseUrl: 'https://k.example.org',
};
const REDIRECT = 'https://k.example.org/v1/oauth/discord/callback';
const TOKEN_URL = 'https://discord.com/api/oauth2/token';
const GUILDS = 'https://discord.com/api/v10/users/@me/guilds?limit=200';
const ACCESS = 'CANARY_discord_access';

const webhook = {
  id: CREDENTIALS.webhookId,
  token: WEBHOOK_TOKEN,
  channel_id: CREDENTIALS.channelId,
  guild_id: CREDENTIALS.guildId,
  name: 'Kronaut',
  application_id: APP.clientId,
  type: 1,
  url: WEBHOOK,
};

const token = (extra: Record<string, unknown> = { webhook }): ScriptedExchange => ({
  method: 'POST',
  url: TOKEN_URL,
  json: {
    access_token: ACCESS,
    refresh_token: 'CANARY_discord_refresh',
    expires_in: 604_800,
    scope: 'webhook.incoming guilds',
    token_type: 'Bearer',
    ...extra,
  },
});

const guilds = (list: unknown, status = 200): ScriptedExchange => ({
  url: GUILDS,
  status,
  json: list,
});

async function finish(exchanges: readonly ScriptedExchange[], params = { code: 'c1', state: 's' }) {
  const http = scriptedHttp(exchanges);
  const outcome = await discordRuntime
    .connectFinish(testBaseContext(http), { app: APP, redirectUri: REDIRECT, pending: {}, params })
    .then(
      (accounts) => ({ account: onlyAccount(accounts), error: undefined }),
      (error: unknown) => {
        if (isProviderFailure(error)) return { account: undefined, error: error.error };
        throw error;
      },
    );
  http.assertDone();
  return { ...outcome, calls: http.calls };
}

describe('discord connect', () => {
  it('asks for the webhook and guilds scopes', async () => {
    const start = await discordRuntime.connectStart(testBaseContext(scriptedHttp([])), {
      app: APP,
      redirectUri: REDIRECT,
      state: 'state-1',
    });
    const url = new URL(start.authorizationUrl);
    expect(url.origin + url.pathname).toBe('https://discord.com/oauth2/authorize');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      response_type: 'code',
      client_id: APP.clientId,
      scope: 'webhook.incoming guilds',
      state: 'state-1',
      redirect_uri: REDIRECT,
    });
    expect(start.pending).toEqual({});
  });

  it('stores only the webhook and names the channel after its server', async () => {
    const other = { id: '1', name: 'Elsewhere', icon: null };
    const mine = { id: CREDENTIALS.guildId, name: 'Ada Lounge', icon: 'abc' };
    const { account, calls } = await finish([token(), guilds([other, mine])]);
    expect(account).toEqual({
      credentials: CREDENTIALS,
      grantedScopes: ['webhook.incoming', 'guilds'],
      providerAccountId: CREDENTIALS.channelId,
      accountKind: 'channel',
      displayName: 'Ada Lounge',
      handle: 'Kronaut',
      profileUrl: `https://discord.com/channels/${CREDENTIALS.guildId}/${CREDENTIALS.channelId}`,
    });
    expect(JSON.stringify(account)).not.toContain('CANARY_discord_access');
    expect(JSON.stringify(account)).not.toContain('CANARY_discord_refresh');
    expect(new URLSearchParams(String(calls[0]?.body))).toEqual(
      new URLSearchParams({
        grant_type: 'authorization_code',
        code: 'c1',
        redirect_uri: REDIRECT,
        client_id: APP.clientId,
        client_secret: 'CANARY_discord_client_secret',
      }),
    );
    expect(calls[1]?.headers.authorization).toBe(`Bearer ${ACCESS}`);
  });

  it.each([
    ['a failed lookup', guilds({ code: 0 }, 500)],
    ['a server missing from the list', guilds([])],
  ])('falls back to the webhook name after %s', async (_name, lookup) => {
    const { account } = await finish([token(), lookup]);
    expect(account?.displayName).toBe('Kronaut');
  });

  it('fails without a webhook in the token response', async () => {
    const { error } = await finish([token({})]);
    expect(error).toEqual({ kind: 'permanent', code: 'webhook_missing' });
  });

  it('fails when the person cancels, without calling Discord', async () => {
    const { error } = await finish([], { code: '', state: 's', error: 'access_denied' } as never);
    expect(error).toEqual({ kind: 'permanent', code: 'authorization_denied' });
  });

  it('flags a rejected client secret as an app incident', async () => {
    const rejected = {
      method: 'POST',
      url: TOKEN_URL,
      status: 401,
      json: { error: 'invalid_client' },
    };
    const { error } = await finish([rejected]);
    expect(error).toEqual({ kind: 'app_config', code: 'client_invalid' });
  });
});

describe('discord revoke', () => {
  it.each([204, 404])('deletes the webhook, done on %i', async (status) => {
    const http = scriptedHttp([{ method: 'DELETE', url: WEBHOOK, status }]);
    await discordRuntime.revoke?.(testBaseContext(http), {
      app: APP,
      account: { providerAccountId: CREDENTIALS.channelId },
      credentials: CREDENTIALS,
    });
    http.assertDone();
    expect(http.calls[0]?.headers.authorization).toBeUndefined();
  });
});
