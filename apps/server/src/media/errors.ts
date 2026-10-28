import type { ApiErrorCode } from '@kronaut/contract';
import { HttpError, type HttpErrorOptions } from '../http/errors.ts';

export type MediaErrorCode = Extract<
  ApiErrorCode,
  | 'conflict'
  | 'forbidden'
  | 'invalid_request'
  | 'media_in_use'
  | 'not_found'
  | 'payload_too_large'
  | 'unsupported_media_type'
>;

export class MediaError extends HttpError {
  constructor(code: MediaErrorCode, message: string, options: HttpErrorOptions = {}) {
    super(code, message, options);
    this.name = 'MediaError';
  }
}
