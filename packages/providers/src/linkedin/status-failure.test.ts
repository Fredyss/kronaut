import { describe, expect, it } from 'vitest';
import { statusTable, TEST_NOW } from '../_kit/testing.ts';
import { failureFromBody } from './errors.ts';

function mapped(status: number, effect: 'private' | 'public', text = '') {
  return failureFromBody(status, text, { effect, now: TEST_NOW }).error;
}

describe('linkedin status mapping', () => {
  it('keeps every status and effect', () => {
    expect(
      statusTable((status, effect) => mapped(status, effect as 'public')),
    ).toMatchInlineSnapshot(`
      {
        "302 private": "{"kind":"permanent","code":"unexpected_status","detail":"http_302"}",
        "302 public": "{"kind":"ambiguous","detail":"http_302"}",
        "400 private": "{"kind":"permanent","code":"invalid_request","detail":"http_400"}",
        "400 public": "{"kind":"permanent","code":"invalid_request","detail":"http_400"}",
        "401 private": "{"kind":"auth_revoked"}",
        "401 public": "{"kind":"auth_revoked"}",
        "403 private": "{"kind":"permanent","code":"permission_missing","detail":"http_403"}",
        "403 public": "{"kind":"permanent","code":"permission_missing","detail":"http_403"}",
        "404 private": "{"kind":"permanent","code":"unexpected_status","detail":"http_404"}",
        "404 public": "{"kind":"ambiguous","detail":"http_404"}",
        "409 private": "{"kind":"transient","detail":"http_409"}",
        "409 public": "{"kind":"ambiguous","detail":"http_409"}",
        "413 private": "{"kind":"permanent","code":"image_too_large","detail":"http_413"}",
        "413 public": "{"kind":"ambiguous","detail":"http_413"}",
        "422 private": "{"kind":"permanent","code":"unprocessable","detail":"http_422"}",
        "422 public": "{"kind":"permanent","code":"unprocessable","detail":"http_422"}",
        "429 private": "{"kind":"rate_limited","scope":"account","resetAt":"2026-10-22T00:00:00Z"}",
        "429 public": "{"kind":"rate_limited","scope":"account","resetAt":"2026-10-22T00:00:00Z"}",
        "500 private": "{"kind":"transient","detail":"http_500"}",
        "500 public": "{"kind":"ambiguous","detail":"http_500"}",
        "503 private": "{"kind":"transient","detail":"http_503"}",
        "503 public": "{"kind":"ambiguous","detail":"http_503"}",
      }
    `);
  });

  it('keeps coded and duplicate bodies', () => {
    const coded = JSON.stringify({ code: 'SERVER_ERROR', message: 'no' });
    const duplicate = JSON.stringify({ message: 'Content is a duplicate of urn:li:share:1' });
    const rows = {
      codedPublic: mapped(503, 'public', coded),
      codedPrivate: mapped(503, 'private', coded),
      coded404: mapped(404, 'public', coded),
      duplicate: mapped(422, 'public', duplicate),
    };
    expect(JSON.stringify(rows)).toMatchInlineSnapshot(
      `"{"codedPublic":{"kind":"ambiguous","detail":"503/SERVER_ERROR"},"codedPrivate":{"kind":"transient","detail":"503/SERVER_ERROR"},"coded404":{"kind":"ambiguous","detail":"404/SERVER_ERROR"},"duplicate":{"kind":"duplicate"}}"`,
    );
  });
});
