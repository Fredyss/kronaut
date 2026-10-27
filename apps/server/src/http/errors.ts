import { API_ERROR_STATUS, type ApiError, type ApiErrorCode, apiError } from '@kronaut/contract';
import type { DenyCode } from '@kronaut/core';

export interface IssueDetail {
  readonly path: string;
  readonly code: string;
}

export interface HttpErrorOptions {
  readonly status?: number;
  readonly details?: readonly IssueDetail[];
}

export class HttpError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly details: readonly IssueDetail[] | undefined;

  constructor(code: ApiErrorCode, message: string, options: HttpErrorOptions = {}) {
    super(message);
    this.name = 'HttpError';
    this.code = code;
    this.status = options.status ?? API_ERROR_STATUS[code];
    this.details = options.details;
  }
}

export function httpError(code: ApiErrorCode, message: string): HttpError {
  return new HttpError(code, message);
}

const DENY_MESSAGES: Readonly<Record<DenyCode, string>> = {
  workspace_mismatch: 'The credential belongs to another workspace.',
  not_permitted: 'Your role does not allow this action.',
  never_grantable: 'API keys and agents cannot perform this action.',
  scope_missing: 'The API key does not have the scope for this action.',
  sponsor_inactive: 'The sponsor of this API key is no longer a member of the workspace.',
  out_of_scope: 'The resource is outside your access scope.',
  not_approver: 'You are not allowed to decide approvals.',
  self_approval: 'You cannot decide your own approval request.',
  reauth_required: 'Reauthentication required: sign in again to continue.',
  otp_required: 'One-time code required: verify the code sent to you to continue.',
  not_in_review_set: 'The post is not part of this review link.',
};

export function denyError(code: DenyCode): HttpError {
  return new HttpError('forbidden', DENY_MESSAGES[code], {
    details: [{ path: 'authorization', code }],
  });
}

// The database triggers are the last line for these rules; a request that reaches one gets a client error.
const TRIGGER_ERRORS: Readonly<Record<string, readonly [ApiErrorCode, string]>> = {
  KR001: ['conflict', 'The change is not allowed in the current state.'],
  KR004: ['conflict', 'The approval does not allow this change.'],
  KR006: ['forbidden', 'This action must be taken by the acting user or API key.'],
};

export function databaseError(err: unknown): unknown {
  const code = typeof err === 'object' && err !== null ? (err as { code?: unknown }).code : null;
  if (typeof code !== 'string' || !Object.hasOwn(TRIGGER_ERRORS, code)) return err;
  const [apiCode, message] = TRIGGER_ERRORS[code] ?? ['internal', ''];
  return new HttpError(apiCode, message);
}

export type ErrorBody = ApiError;

export function errorBody(error: HttpError, requestId: string): ErrorBody {
  const body = apiError(error.code, error.message, requestId);
  if (error.details === undefined) return body;
  return { error: { ...body.error, details: [...error.details] } };
}
