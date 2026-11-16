import type { ProviderHttpResponse, StepEffect } from '@kronaut/core';
import { describe, expect, it } from 'vitest';
import { TEST_NOW } from '../testing.ts';
import { discordFailure } from './api.ts';

function response(status: number, body: unknown, headers: Record<string, string> = {}) {
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  return {
    status,
    headers: new Headers(headers),
    url: 'https://discord.com/api/v10/webhooks/1/CANARY_token',
    bytes: async () => new TextEncoder().encode(text),
    text: async () => text,
    json: async () => JSON.parse(text),
  } satisfies ProviderHttpResponse;
}

async function classify(res: ProviderHttpResponse, effect: StepEffect = 'public') {
  return (await discordFailure(res, effect, TEST_NOW)).error;
}

const at = (ms: number) => TEST_NOW.add({ milliseconds: ms });

describe('discord error mapping', () => {
  it.each([
    ['404', response(404, { code: 10015, message: 'Unknown Webhook' }), { kind: 'auth_revoked' }],
    ['10015 on another status', response(400, { code: 10015 }), { kind: 'auth_revoked' }],
    ['401 invalid token', response(401, { code: 50027 }), { kind: 'auth_revoked' }],
    ['413', response(413, 'too big'), { kind: 'permanent', code: 'too_large', detail: 'http_413' }],
    [
      '400 forum channel',
      response(400, { code: 220001 }),
      { kind: 'permanent', code: 'forum_channel_unsupported', detail: '400/220001' },
    ],
    [
      'another 4xx',
      response(403, { code: 50013 }),
      { kind: 'permanent', code: 'request_rejected', detail: '403/50013' },
    ],
    ['5xx after the send', response(502, 'no gateway'), { kind: 'ambiguous', detail: 'http_502' }],
  ])('maps %s', async (_name, res, expected) => {
    expect(await classify(res)).toEqual(expected);
  });

  it('maps 5xx on a private call to transient', async () => {
    expect(await classify(response(500, {}), 'private')).toEqual({
      kind: 'transient',
      detail: 'http_500',
    });
  });

  it('reads retry_after in seconds and the scope of a 429', async () => {
    expect(await classify(response(429, { retry_after: 1.234, global: false }))).toEqual({
      kind: 'rate_limited',
      scope: 'account',
      resetAt: at(1234),
    });
    expect(await classify(response(429, { retry_after: 2, global: true }))).toEqual({
      kind: 'rate_limited',
      scope: 'app',
      resetAt: at(2000),
    });
    const header = response(429, 'slow down', {
      'retry-after': '7',
      'x-ratelimit-scope': 'global',
    });
    expect(await classify(header)).toEqual({
      kind: 'rate_limited',
      scope: 'app',
      resetAt: at(7000),
    });
  });
});
