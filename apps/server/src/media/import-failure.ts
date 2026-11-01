import { EgressError, type EgressErrorCode } from '@kronaut/egress';
import { MediaError } from './errors.ts';

export const IMPORT_ERRORS = [
  'url_blocked',
  'fetch_failed',
  'timed_out',
  'file_too_large',
  'unsupported_type',
  'file_corrupt',
  'stalled',
] as const;

export type ImportError = (typeof IMPORT_ERRORS)[number];

export interface ImportFailure {
  readonly kind: ImportError;
  readonly retryable: boolean;
}

const RETRY: ImportFailure = { kind: 'fetch_failed', retryable: true };

const refused = (kind: ImportError): ImportFailure => ({ kind, retryable: false });

const EGRESS_FAILURES: Readonly<Record<EgressErrorCode, ImportFailure>> = {
  blocked_address: refused('url_blocked'),
  blocked_host: refused('url_blocked'),
  blocked_scheme: refused('url_blocked'),
  blocked_port: refused('url_blocked'),
  too_many_redirects: refused('url_blocked'),
  response_too_large: refused('file_too_large'),
  timeout: refused('timed_out'),
  dns_failure: RETRY,
  network: RETRY,
};

const MEDIA_FAILURES: Readonly<Record<string, ImportError>> = {
  payload_too_large: 'file_too_large',
  unsupported_media_type: 'unsupported_type',
  invalid_request: 'file_corrupt',
};

export class ImportRefused extends Error {
  readonly failure: ImportFailure;

  constructor(failure: ImportFailure) {
    super(failure.kind);
    this.name = 'ImportRefused';
    this.failure = failure;
  }
}

export function refuseImport(kind: ImportError): ImportRefused {
  return new ImportRefused(refused(kind));
}

export function badStatus(status: number): ImportRefused {
  return new ImportRefused(status >= 500 || status === 429 ? RETRY : refused('fetch_failed'));
}

export function classifyImportFailure(error: unknown): ImportFailure {
  if (error instanceof ImportRefused) return error.failure;
  if (error instanceof EgressError) return EGRESS_FAILURES[error.code];
  if (error instanceof MediaError) {
    const kind = MEDIA_FAILURES[error.code];
    if (kind !== undefined) return refused(kind);
  }
  return RETRY;
}
