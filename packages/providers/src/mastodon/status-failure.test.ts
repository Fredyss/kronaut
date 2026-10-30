import type { ProviderHttpResponse } from '@kronaut/core';
import { describe, expect, it } from 'vitest';
import { scriptedHttp, statusTable, testBaseContext } from '../_kit/testing.ts';
import { failureOf } from './publish-state.ts';

const ctx = testBaseContext(scriptedHttp([]));

function response(status: number, headers: Record<string, string> = {}): ProviderHttpResponse {
  return { status, headers: new Headers(headers) } as ProviderHttpResponse;
}

describe('mastodon status mapping', () => {
  it('keeps every status and effect', () => {
    const table = statusTable(
      (status, effect) => failureOf(ctx, response(status), effect, 'invalid').error,
    );
    expect(table).toMatchInlineSnapshot(`
      {
        "302 private": "{"kind":"permanent","code":"unexpected_response"}",
        "302 public": "{"kind":"ambiguous","detail":"unexpected_response"}",
        "400 private": "{"kind":"permanent","code":"http_400"}",
        "400 public": "{"kind":"permanent","code":"http_400"}",
        "401 private": "{"kind":"auth_revoked"}",
        "401 public": "{"kind":"auth_revoked"}",
        "403 private": "{"kind":"permanent","code":"http_403"}",
        "403 public": "{"kind":"permanent","code":"http_403"}",
        "404 private": "{"kind":"permanent","code":"http_404"}",
        "404 public": "{"kind":"permanent","code":"http_404"}",
        "409 private": "{"kind":"permanent","code":"http_409"}",
        "409 public": "{"kind":"permanent","code":"http_409"}",
        "413 private": "{"kind":"permanent","code":"http_413"}",
        "413 public": "{"kind":"permanent","code":"http_413"}",
        "422 private": "{"kind":"permanent","code":"invalid"}",
        "422 public": "{"kind":"permanent","code":"invalid"}",
        "429 private": "{"kind":"rate_limited","scope":"account","resetAt":"2026-10-21T12:05:00Z"}",
        "429 public": "{"kind":"rate_limited","scope":"account","resetAt":"2026-10-21T12:05:00Z"}",
        "500 private": "{"kind":"transient","detail":"http_500"}",
        "500 public": "{"kind":"ambiguous","detail":"http_500"}",
        "503 private": "{"kind":"transient","detail":"http_503"}",
        "503 public": "{"kind":"ambiguous","detail":"http_503"}",
      }
    `);
  });

  it('reads the rate-limit reset header', () => {
    const headers = { 'x-ratelimit-reset': '2026-10-21T13:00:00.000Z' };
    const { error } = failureOf(ctx, response(429, headers), 'public', 'invalid');
    expect(JSON.stringify(error)).toMatchInlineSnapshot(
      `"{"kind":"rate_limited","scope":"account","resetAt":"2026-10-21T13:00:00Z"}"`,
    );
  });
});
