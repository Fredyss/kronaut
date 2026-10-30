import * as z from 'zod';

export const API_ERROR_CODES = [
  'invalid_request',
  'unauthenticated',
  'forbidden',
  'approval_required',
  'not_found',
  'conflict',
  'version_conflict',
  'not_editable',
  'destination_live',
  'media_in_use',
  'tag_exists',
  'tag_limit',
  'saved_text_exists',
  'saved_text_limit',
  'idempotency_key_reused',
  'idempotency_key_required',
  'payload_too_large',
  'unsupported_media_type',
  'unprocessable',
  'preflight_failed',
  'rate_limited',
  'internal',
  'unavailable',
] as const;
export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export const API_ERROR_STATUS: Readonly<Record<ApiErrorCode, number>> = {
  invalid_request: 400,
  unauthenticated: 401,
  forbidden: 403,
  approval_required: 403,
  not_found: 404,
  conflict: 409,
  version_conflict: 409,
  not_editable: 409,
  destination_live: 409,
  media_in_use: 409,
  tag_exists: 409,
  tag_limit: 409,
  saved_text_exists: 409,
  saved_text_limit: 409,
  idempotency_key_reused: 409,
  idempotency_key_required: 428,
  payload_too_large: 413,
  unsupported_media_type: 415,
  unprocessable: 422,
  preflight_failed: 422,
  rate_limited: 429,
  internal: 500,
  unavailable: 503,
};

export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    requestId: z.string().optional(),
    details: z.array(z.object({ path: z.string(), code: z.string() })).optional(),
  }),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

export function apiError(code: ApiErrorCode, message: string, requestId?: string): ApiError {
  return {
    error: requestId === undefined ? { code, message } : { code, message, requestId },
  };
}
