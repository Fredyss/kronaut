import { describe, expect, it } from 'vitest';
import {
  API_ERROR_CODES,
  API_ERROR_STATUS,
  type ApiErrorCode,
  ApiErrorSchema,
  apiError,
} from './errors.ts';

describe('status table', () => {
  it.each<[ApiErrorCode, number]>([
    ['invalid_request', 400],
    ['unauthenticated', 401],
    ['forbidden', 403],
    ['approval_required', 403],
    ['not_found', 404],
    ['conflict', 409],
    ['version_conflict', 409],
    ['not_editable', 409],
    ['destination_live', 409],
    ['media_in_use', 409],
    ['idempotency_key_reused', 409],
    ['idempotency_key_required', 428],
    ['payload_too_large', 413],
    ['unsupported_media_type', 415],
    ['unprocessable', 422],
    ['rate_limited', 429],
    ['internal', 500],
    ['unavailable', 503],
  ])('%s → %i', (code, status) => {
    expect(API_ERROR_STATUS[code]).toBe(status);
  });

  it('covers every code exactly once', () => {
    expect(new Set(API_ERROR_CODES).size).toBe(API_ERROR_CODES.length);
    expect(Object.keys(API_ERROR_STATUS).sort()).toEqual([...API_ERROR_CODES].sort());
  });
});

describe('apiError', () => {
  it('wraps code and message in the envelope', () => {
    expect(apiError('not_found', 'No such post')).toEqual({
      error: { code: 'not_found', message: 'No such post' },
    });
  });

  it('leaves requestId out unless given', () => {
    expect('requestId' in apiError('internal', 'x').error).toBe(false);
    expect(apiError('internal', 'x', 'req-1').error.requestId).toBe('req-1');
  });

  it('produces envelopes the schema accepts', () => {
    expect(ApiErrorSchema.safeParse(apiError('conflict', 'x', 'req-1')).success).toBe(true);
    expect(ApiErrorSchema.safeParse(apiError('conflict', 'x')).success).toBe(true);
  });
});

describe('ApiErrorSchema', () => {
  it('rejects envelopes without a code or message', () => {
    expect(ApiErrorSchema.safeParse({ error: { message: 'x' } }).success).toBe(false);
    expect(ApiErrorSchema.safeParse({ error: { code: 'x' } }).success).toBe(false);
    expect(ApiErrorSchema.safeParse({ code: 'x', message: 'y' }).success).toBe(false);
  });
});
