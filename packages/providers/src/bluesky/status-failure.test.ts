import { describe, expect, it } from 'vitest';
import { statusTable, TEST_NOW } from '../_kit/testing.ts';
import type { ResourceReply } from './dpop.ts';
import { failureOf } from './publish.ts';

function reply(
  status: number,
  body: unknown = {},
  headers: Record<string, string> = {},
): ResourceReply {
  return { response: { status, headers: new Headers(headers) }, body } as ResourceReply;
}

describe('bluesky status mapping', () => {
  it('keeps every status and effect', () => {
    const table = statusTable((status, effect) => failureOf(reply(status), effect, TEST_NOW));
    expect(table).toMatchInlineSnapshot(`
      {
        "302 private": "{"kind":"transient","detail":"http_302"}",
        "302 public": "{"kind":"ambiguous","detail":"http_302"}",
        "400 private": "{"kind":"permanent","code":"http_400"}",
        "400 public": "{"kind":"permanent","code":"http_400"}",
        "401 private": "{"kind":"auth_expired"}",
        "401 public": "{"kind":"auth_expired"}",
        "403 private": "{"kind":"permanent","code":"http_403"}",
        "403 public": "{"kind":"permanent","code":"http_403"}",
        "404 private": "{"kind":"permanent","code":"http_404"}",
        "404 public": "{"kind":"permanent","code":"http_404"}",
        "409 private": "{"kind":"permanent","code":"http_409"}",
        "409 public": "{"kind":"permanent","code":"http_409"}",
        "413 private": "{"kind":"permanent","code":"http_413"}",
        "413 public": "{"kind":"permanent","code":"http_413"}",
        "422 private": "{"kind":"permanent","code":"http_422"}",
        "422 public": "{"kind":"permanent","code":"http_422"}",
        "429 private": "{"kind":"rate_limited","scope":"account","resetAt":"2026-10-21T12:01:00Z"}",
        "429 public": "{"kind":"rate_limited","scope":"account","resetAt":"2026-10-21T12:01:00Z"}",
        "500 private": "{"kind":"transient","detail":"http_500"}",
        "500 public": "{"kind":"ambiguous","detail":"http_500"}",
        "503 private": "{"kind":"transient","detail":"http_503"}",
        "503 public": "{"kind":"ambiguous","detail":"http_503"}",
      }
    `);
  });

  it('keeps named errors, the DPoP nonce and rate-limit headers', () => {
    const headers = { 'ratelimit-reset': '1793000000', 'ratelimit-policy': '100;w=86400' };
    const rows = {
      named: failureOf(reply(400, { error: 'InvalidRecord' }), 'public', TEST_NOW),
      unnamed: failureOf(reply(400, { error: 'bad error!' }), 'public', TEST_NOW),
      nonce: failureOf(reply(401, { error: 'use_dpop_nonce' }), 'public', TEST_NOW),
      limited: failureOf(reply(429, {}, headers), 'public', TEST_NOW),
    };
    expect(JSON.stringify(rows)).toMatchInlineSnapshot(
      `"{"named":{"kind":"permanent","code":"InvalidRecord"},"unnamed":{"kind":"permanent","code":"http_400"},"nonce":{"kind":"transient","detail":"dpop_nonce_rejected"},"limited":{"kind":"rate_limited","scope":"account","resetAt":"2026-10-26T07:33:20Z"}}"`,
    );
  });
});
