export type EgressErrorCode =
  | 'blocked_address'
  | 'blocked_host'
  | 'blocked_scheme'
  | 'blocked_port'
  | 'too_many_redirects'
  | 'response_too_large'
  | 'timeout'
  | 'dns_failure'
  | 'network';

export class EgressError extends Error {
  readonly code: EgressErrorCode;

  constructor(code: EgressErrorCode, message?: string, options?: ErrorOptions) {
    super(message ?? code, options);
    this.name = 'EgressError';
    this.code = code;
  }
}
