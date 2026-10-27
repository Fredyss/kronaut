import { describe, expect, it } from 'vitest';
import { type ScriptedExchange, scriptedHttp, testBaseContext } from '../_kit/testing.ts';
import { mastodonRuntime } from './runtime.ts';
import { failureOf, HOST, input, ORIGIN, TOKEN } from './testing.ts';

const { app, account, credentials } = input([]);

function revoke(http: ReturnType<typeof scriptedHttp>) {
  if (mastodonRuntime.revoke === undefined) throw new Error('mastodon revokes tokens');
  return mastodonRuntime.revoke(testBaseContext(http), { app, account, credentials });
}

function reply(status: number, json: unknown = {}): ScriptedExchange {
  return { method: 'POST', url: `${ORIGIN}/oauth/revoke`, status, json };
}

describe('mastodon revoke', () => {
  it('posts the token with the app credentials to the instance', async () => {
    const http = scriptedHttp([reply(200)]);
    await revoke(http);
    http.assertDone();
    expect(http.calls[0]?.url).toBe(`https://${HOST}/oauth/revoke`);
    expect(http.calls[0]?.headers.authorization).toBeUndefined();
    expect(Object.fromEntries(new URLSearchParams(String(http.calls[0]?.body)))).toEqual({
      client_id: 'client-1',
      client_secret: 's',
      token: TOKEN,
    });
  });

  it('maps a refusal to permanent and an outage to transient', async () => {
    const refused = scriptedHttp([reply(403, { error: 'unauthorized_client' })]);
    expect(await failureOf(revoke(refused))).toEqual({
      kind: 'permanent',
      code: 'unauthorized_client',
    });
    const odd = scriptedHttp([reply(400, 'nope')]);
    expect(await failureOf(revoke(odd))).toEqual({ kind: 'permanent', code: 'revoke_rejected' });
    const down = scriptedHttp([reply(503)]);
    expect(await failureOf(revoke(down))).toEqual({ kind: 'transient', detail: 'http_503' });
  });
});
