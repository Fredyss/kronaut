import {
  decodePublicId,
  GRANTABLE_SCOPES,
  type GrantableScope,
  type IdKind,
  isGrantableScope,
  NEVER_GRANTABLE_ACTIONS,
} from '@kronaut/core';
import { Temporal } from 'temporal-polyfill';
import { HttpError } from '../../../base/http/errors.ts';
import { invalid } from '../../../base/http/issues.ts';

export const NAME_MAX = 120;
export const ACCESS_MAX = 100;
export const RATE_LIMIT_MAX = 6000;
export const LIST_DEFAULT_LIMIT = 50;
export const LIST_MAX_LIMIT = 100;

export interface GrantPage {
  readonly after: string | null;
  readonly limit: number;
}

const NEVER_GRANTABLE: ReadonlySet<string> = new Set(NEVER_GRANTABLE_ACTIONS);

export interface AccessIds {
  readonly brandIds: readonly string[];
  readonly locationIds: readonly string[];
  readonly accountIds: readonly string[];
}

export const NO_ACCESS: AccessIds = { brandIds: [], locationIds: [], accountIds: [] };

export function refused(path: string, code: string, message: string): HttpError {
  return new HttpError('unprocessable', message, { details: [{ path, code }] });
}

export function grantName(value: string): string {
  const name = value.normalize('NFC').trim();
  const length = [...name].length;
  if (length === 0 || length > NAME_MAX) {
    throw refused('body.name', 'name_invalid', `The name must have 1 to ${NAME_MAX} characters.`);
  }
  return name;
}

export function grantScopes(values: readonly string[]): GrantableScope[] {
  if (values.some((value) => NEVER_GRANTABLE.has(value))) {
    throw refused('body.scopes', 'never_grantable', 'API keys can never hold this scope.');
  }
  if (!values.every(isGrantableScope)) {
    throw refused('body.scopes', 'unknown_scope', 'The scope does not exist.');
  }
  return GRANTABLE_SCOPES.filter((scope) => values.includes(scope));
}

export function grantExpiry(
  value: string | null | undefined,
  now: Temporal.Instant,
): Temporal.Instant | null {
  if (value === null || value === undefined) return null;
  const at = Temporal.Instant.from(value);
  if (Temporal.Instant.compare(at, now) <= 0) {
    throw refused('body.expiresAt', 'in_past', 'The expiry must be in the future.');
  }
  return at;
}

function decodeAll(kind: IdKind, values: readonly string[], path: string): string[] {
  const ids = values.map((value) => decodePublicId(kind, value));
  if (ids.some((id) => id === null)) throw refused(path, 'invalid', 'The id is not valid.');
  return [...new Set(ids as string[])];
}

export function grantAccess(restricted: boolean, access: AccessIds | undefined): AccessIds {
  if (access === undefined) return NO_ACCESS;
  if (!restricted) {
    throw refused(
      'body.access',
      'not_restricted',
      'Access lists apply only to a restricted API key.',
    );
  }
  return {
    brandIds: decodeAll('brand', access.brandIds, 'body.access.brandIds'),
    locationIds: decodeAll('location', access.locationIds, 'body.access.locationIds'),
    accountIds: decodeAll('socialAccount', access.accountIds, 'body.access.accountIds'),
  };
}

export function grantPage(cursor: string | undefined, limit: string | undefined): GrantPage {
  const after = cursor === undefined ? null : decodePublicId('grant', cursor);
  if (cursor !== undefined && after === null) {
    throw invalid([{ path: 'query.cursor', code: 'invalid_cursor' }]);
  }
  const size = limit === undefined ? LIST_DEFAULT_LIMIT : Number(limit);
  if (!/^[0-9]{1,3}$/.test(limit ?? '1') || size < 1 || size > LIST_MAX_LIMIT) {
    throw invalid([{ path: 'query.limit', code: 'invalid_limit' }]);
  }
  return { after, limit: size };
}
