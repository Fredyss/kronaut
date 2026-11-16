import { isProviderFailure } from '@kronaut/core';

const CONNECT_ERRORS = [
  'state_invalid',
  'session_mismatch',
  'forbidden',
  'provider_denied',
  'provider_error',
  'app_config',
  'no_accounts',
  'too_many_accounts',
  'server_error',
] as const;
export type ConnectError = (typeof CONNECT_ERRORS)[number];

type FailureReason = Readonly<Record<string, string>>;

export class ConnectFailure extends Error {
  readonly code: ConnectError;
  readonly reason: FailureReason;

  constructor(code: ConnectError, reason: FailureReason = {}) {
    super(`connect failed: ${code}`);
    this.name = 'ConnectFailure';
    this.code = code;
    this.reason = reason;
  }
}

const LOGGABLE_CODE = /^[A-Za-z0-9_.:-]{1,64}$/;

export function loggable(value: string): string {
  return LOGGABLE_CODE.test(value) ? value : 'unrecognised';
}

export function providerReason(err: unknown): FailureReason {
  if (!isProviderFailure(err)) return { providerKind: 'unexpected' };
  const { error } = err;
  return error.kind === 'permanent' || error.kind === 'app_config'
    ? { providerKind: error.kind, providerCode: loggable(error.code) }
    : { providerKind: error.kind };
}
