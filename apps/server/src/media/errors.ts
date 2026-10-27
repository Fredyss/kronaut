import type { ApiErrorCode } from '@kronaut/contract';
import { HttpError } from '../http/errors.ts';

export type MediaErrorCode = Extract<
  ApiErrorCode,
  'forbidden' | 'invalid_request' | 'not_found' | 'payload_too_large' | 'unsupported_media_type'
>;

export class MediaError extends HttpError {
  constructor(code: MediaErrorCode, message: string) {
    super(code, message);
    this.name = 'MediaError';
  }
}
