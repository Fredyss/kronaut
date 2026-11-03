import { ApiRequestError } from '@kronaut/sdk';

export interface ErrorDetail {
  readonly path: string;
  readonly code: string;
}

export function isUnauthenticated(error: unknown): boolean {
  return error instanceof ApiRequestError && error.status === 401;
}

export function errorCode(error: unknown): string {
  return error instanceof ApiRequestError ? error.code : 'internal';
}

export function errorStatus(error: unknown): number | null {
  return error instanceof ApiRequestError ? error.status : null;
}

export function detailCodes(error: unknown): readonly string[] {
  if (!(error instanceof ApiRequestError)) return [];
  return error.body.error.details?.map((detail) => detail.code) ?? [];
}

export function errorDetails(error: unknown): readonly ErrorDetail[] {
  if (!(error instanceof ApiRequestError)) return [];
  return error.body.error.details ?? [];
}
