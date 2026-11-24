import { describe, expect, it } from 'vitest';
import { TEST_NOW } from '../_kit/testing.ts';
import { failureFromBody } from './errors.ts';
import { run, TWEETS_URL } from './testing.ts';

const PROBLEM = 'https://api.x.com/2/problems';

function classify(status: number, body: unknown, headers: Record<string, string> = {}) {
  const response = { status, headers: new Headers(headers) };
  const text = typeof body === 'string' ? body : JSON.stringify(body);
  return failureFromBody(response, text, 'public', TEST_NOW).error;
}

describe('x errors', () => {
  it('fails the post, not the app, when the credits run out', async () => {
    expect(classify(402, '')).toEqual({
      kind: 'permanent',
      code: 'credits_depleted',
      detail: 'http_402',
    });
    expect(
      classify(403, { title: 'Forbidden', detail: 'Your enrolled account has no credits left.' }),
    ).toEqual({ kind: 'permanent', code: 'credits_depleted', detail: 'http_403' });
    const { error } = await run('publish', [{ method: 'POST', url: TWEETS_URL, status: 402 }]);
    expect(error).toMatchObject({ kind: 'permanent', code: 'credits_depleted' });
  });

  it('keeps any other 403 on the destination', () => {
    expect(classify(403, { type: `${PROBLEM}/client-forbidden`, title: 'Forbidden' })).toEqual({
      kind: 'permanent',
      code: 'forbidden',
      detail: '403/client-forbidden',
    });
  });

  it('waits for x-rate-limit-reset on a 429', () => {
    const reset = String(TEST_NOW.epochMilliseconds / 1000 + 600);
    expect(
      classify(429, { type: `${PROBLEM}/rate-limit-exceeded` }, { 'x-rate-limit-reset': reset }),
    ).toEqual({ kind: 'rate_limited', scope: 'account', resetAt: TEST_NOW.add({ seconds: 600 }) });
    expect(classify(429, '')).toEqual({
      kind: 'rate_limited',
      scope: 'account',
      resetAt: TEST_NOW.add({ minutes: 15 }),
    });
  });

  it('waits on the app for a usage cap', () => {
    expect(classify(429, { type: `${PROBLEM}/usage-capped` })).toEqual({
      kind: 'rate_limited',
      scope: 'app',
      resetAt: TEST_NOW.add({ minutes: 15 }),
    });
  });

  it('backs off when the reset time has already passed', () => {
    const past = String(TEST_NOW.epochMilliseconds / 1000 - 60);
    expect(classify(429, '', { 'x-rate-limit-reset': past })).toEqual({
      kind: 'rate_limited',
      scope: 'account',
      resetAt: TEST_NOW.add({ minutes: 15 }),
    });
  });

  it('never retries an unclear answer to the public step', () => {
    expect(classify(503, '')).toEqual({ kind: 'ambiguous', detail: 'http_503' });
    expect(classify(401, '')).toEqual({ kind: 'ambiguous', detail: 'http_401' });
    expect(classify(400, { type: `${PROBLEM}/invalid-request` })).toEqual({
      kind: 'permanent',
      code: 'invalid_request',
      detail: '400/invalid-request',
    });
  });
});
