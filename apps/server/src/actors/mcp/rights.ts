import { authorize, type GrantableScope, type Principal } from '@kronaut/core';
import type { Temporal } from 'temporal-polyfill';
import { deniedAtEntry } from '../../base/http/pipeline/context.ts';

export type Rights = (scope: GrantableScope) => boolean;

export function toolRights(
  principal: Principal | null,
  workspaceId: string,
  now: Temporal.Instant,
): Rights {
  return (scope) =>
    principal !== null &&
    deniedAtEntry(authorize(principal, scope, { workspaceId }, { now })) === null;
}
