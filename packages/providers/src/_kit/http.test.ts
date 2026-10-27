import { isProviderFailure } from '@kronaut/core';
import { describe, expect, it } from 'vitest';
import * as z from 'zod';
import { readJson, retryAfter, send, tryJson } from './http.ts';
import { egressError, scriptedHttp, TEST_NOW, testBaseContext } from './testing.ts';

const URL_A = 'https://api.example.test/a';

async function failureOf(promise: Promise<unknown>) {
  const error = await promise.then(
    () => undefined,
    (e: unknown) => e,
  );
  if (!isProviderFailure(error)) throw new Error('expected a ProviderFailure');
  return error.error;
}

describe('send', () => {
  it('passes the context signal and the request through', async () => {
    const http = scriptedHttp([{ method: 'POST', url: URL_A, json: { ok: true } }]);
    const ctx = testBaseContext(http);
    const response = await send(ctx, 'private', URL_A, { method: 'POST', body: 'x' });
    expect(response.status).toBe(200);
    expect(http.calls[0]?.body).toBe('x');
    expect(http.calls[0]?.signal).toBe(ctx.signal);
    http.assertDone();
  });

  it('keeps the context signal when the request brings its own', async () => {
    const attempt = new AbortController();
    const call = new AbortController();
    const http = scriptedHttp([{ url: URL_A }]);
    const ctx = { ...testBaseContext(http), signal: attempt.signal };
    await send(ctx, 'private', URL_A, { signal: call.signal });
    const combined = http.calls[0]?.signal;
    expect(combined?.aborted).toBe(false);
    attempt.abort();
    expect(combined?.aborted).toBe(true);
  });

  it('classifies a thrown egress error by the step effect', async () => {
    const http = scriptedHttp([{ url: URL_A, error: egressError('timeout') }]);
    expect(await failureOf(send(testBaseContext(http), 'public', URL_A))).toEqual({
      kind: 'ambiguous',
      detail: 'timeout',
    });
  });
});

describe('readJson', () => {
  const schema = z.object({ id: z.string() });

  it('returns the parsed body', async () => {
    const http = scriptedHttp([{ url: URL_A, json: { id: 'x', extra: 1 } }]);
    const response = await send(testBaseContext(http), 'private', URL_A);
    expect(await readJson(response, schema, 'private')).toEqual({ id: 'x' });
  });

  it('rejects a body that does not match the schema', async () => {
    const http = scriptedHttp([{ url: URL_A, json: { id: 1 } }]);
    const response = await send(testBaseContext(http), 'public', URL_A);
    expect(await failureOf(readJson(response, schema, 'public'))).toEqual({
      kind: 'ambiguous',
      detail: 'unexpected_response',
    });
  });

  it('rejects a body that is not JSON', async () => {
    const http = scriptedHttp([{ url: URL_A, text: '<html>' }]);
    const response = await send(testBaseContext(http), 'private', URL_A);
    expect(await failureOf(readJson(response, schema, 'private'))).toEqual({
      kind: 'permanent',
      code: 'unexpected_response',
    });
  });
});

describe('tryJson', () => {
  it('returns undefined for a body that is not JSON', async () => {
    const http = scriptedHttp([{ url: URL_A, text: 'nope' }]);
    expect(await tryJson(await send(testBaseContext(http), 'none', URL_A))).toBeUndefined();
  });
});

describe('retryAfter', () => {
  const at = (headers: Record<string, string>) =>
    retryAfter(new Headers(headers), TEST_NOW, 60_000).toString();

  it('reads delta seconds', () => {
    expect(at({ 'retry-after': '120' })).toBe('2026-10-21T12:02:00Z');
  });

  it('reads an HTTP date', () => {
    expect(at({ 'retry-after': 'Wed, 21 Oct 2026 12:05:00 GMT' })).toBe('2026-10-21T12:05:00Z');
  });

  it('never returns a time in the past', () => {
    expect(at({ 'retry-after': 'Wed, 21 Oct 2026 11:00:00 GMT' })).toBe('2026-10-21T12:00:00Z');
  });

  it('falls back when the header is missing or unreadable', () => {
    expect(at({})).toBe('2026-10-21T12:01:00Z');
    expect(at({ 'retry-after': 'soon' })).toBe('2026-10-21T12:01:00Z');
    expect(at({ 'retry-after': '99999999999999' })).toBe('2026-10-21T12:01:00Z');
  });
});
