import type { PublishContext } from '@kronaut/core';
import { type ErrorFacts, fail, type GraphFailure, NotReady } from '../_kit/meta-graph-call.ts';

export const QUOTA_RESET_MS = 60 * 60 * 1000;

const RECREATE_SUBCODES = new Set([2207003, 2207020, 2207052]);
const AUTH_EXPIRED_SUBCODES = new Set([2207005, 2207006]);
export const PERMANENT_SUBCODES: ReadonlyMap<number, string> = new Map([
  [2207050, 'account_restricted'],
  [2207051, 'suspected_spam'],
  [2207010, 'caption_too_long'],
]);
const SUBCODE_TEMPORARY = 2207008;
const SUBCODE_NOT_READY = 2207027;
const SUBCODE_PUBLISH_CAP = 2207042;

export function classifyInstagram(
  ctx: PublishContext,
  { codes: { subcode }, isPublic, withDetail }: ErrorFacts,
): GraphFailure | NotReady | undefined {
  if (subcode === undefined) return undefined;
  if (RECREATE_SUBCODES.has(subcode)) return fail({ kind: 'transient', ...withDetail }, true);
  if (subcode === SUBCODE_TEMPORARY) return fail({ kind: 'transient', ...withDetail });
  if (subcode === SUBCODE_NOT_READY)
    return isPublic ? fail({ kind: 'transient', ...withDetail }) : new NotReady();
  const known = PERMANENT_SUBCODES.get(subcode);
  if (known !== undefined) return fail({ kind: 'permanent', code: known, ...withDetail });
  if (subcode === SUBCODE_PUBLISH_CAP)
    return fail({
      kind: 'rate_limited',
      scope: 'account',
      resetAt: ctx.now().add({ milliseconds: QUOTA_RESET_MS }),
    });
  if (AUTH_EXPIRED_SUBCODES.has(subcode)) return fail({ kind: 'auth_expired' });
  return undefined;
}
