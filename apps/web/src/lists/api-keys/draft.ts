import type { GrantsCreateData } from '@kronaut/sdk';
import { Temporal } from 'temporal-polyfill';
import { browserTimeZone } from '../../base/locale/browser.ts';
import { RATE_LIMIT_MAX } from './queries.ts';
import { GRANTABLE_SCOPES, type GrantableScope } from './scopes.ts';

export type Access = 'workspace' | 'restricted';

export interface KeyDraft {
  readonly name: string;
  readonly scopes: ReadonlySet<GrantableScope>;
  readonly access: Access;
  readonly brandIds: ReadonlySet<string>;
  readonly accountIds: ReadonlySet<string>;
  readonly expiresOn: string;
  readonly rateLimit: string;
}

export type CreateBody = GrantsCreateData['body'];

export const EMPTY_DRAFT: KeyDraft = {
  name: '',
  scopes: new Set(),
  access: 'workspace',
  brandIds: new Set(),
  accountIds: new Set(),
  expiresOn: '',
  rateLimit: '',
};

export function today(): string {
  return Temporal.Now.plainDateISO(browserTimeZone()).toString();
}

function endOfDay(date: string): string {
  return Temporal.PlainDate.from(date)
    .add({ days: 1 })
    .toZonedDateTime(browserTimeZone())
    .toString({ timeZoneName: 'never' });
}

export function rateLimitOf(value: string): number | null | undefined {
  const text = value.trim();
  if (text === '') return null;
  const limit = /^[0-9]{1,4}$/.test(text) ? Number(text) : Number.NaN;
  return limit >= 1 && limit <= RATE_LIMIT_MAX ? limit : undefined;
}

export function draftReady(draft: KeyDraft): boolean {
  return (
    draft.name.trim() !== '' && draft.scopes.size > 0 && rateLimitOf(draft.rateLimit) !== undefined
  );
}

export function bodyOf(draft: KeyDraft): CreateBody {
  const restricted = draft.access === 'restricted';
  return {
    name: draft.name.normalize('NFC').trim(),
    scopes: GRANTABLE_SCOPES.filter((scope) => draft.scopes.has(scope)),
    resourceScope: draft.access,
    ...(restricted
      ? {
          access: {
            brandIds: [...draft.brandIds],
            locationIds: [],
            accountIds: [...draft.accountIds],
          },
        }
      : {}),
    expiresAt: draft.expiresOn === '' ? null : endOfDay(draft.expiresOn),
    rateLimitPerMinute: rateLimitOf(draft.rateLimit) ?? null,
  };
}
