import { type Action, authorize, type Decision, type Resource } from '@kronaut/core';
import { type Actor, actorSetting, type TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import type { Temporal } from 'temporal-polyfill';
import { HttpError } from '../http/errors.ts';
import type { RequestContext } from '../http/types.ts';
import { schedulerPrincipal } from '../publish/principal.ts';
import type { SeriesRow } from './store.ts';

export class OwnerLost extends Error {
  constructor() {
    super('the series owner may no longer schedule or submit');
    this.name = 'OwnerLost';
  }
}

export interface OwnerActing extends Pick<RequestContext, 'principal' | 'now' | 'authorize'> {
  readonly actor: Actor;
  decide(action: Action, resource: Resource, approval: 'exempt' | 'approved' | 'missing'): Decision;
}

export function ownerActor(row: SeriesRow): Actor {
  if (row.owner_user_id !== null) return { kind: 'user', id: row.owner_user_id };
  if (row.owner_grant_id !== null) return { kind: 'grant', id: row.owner_grant_id };
  throw new Error('a series has exactly one owner');
}

export async function ownerActing(
  trx: TenantDb,
  workspaceId: string,
  row: SeriesRow,
  now: Temporal.Instant,
): Promise<OwnerActing> {
  const scheduler = { userId: row.owner_user_id, grantId: row.owner_grant_id };
  const bound = await schedulerPrincipal(trx, workspaceId, scheduler, now);
  if (bound === null) throw new OwnerLost();
  const { principal, accessScope } = bound;
  const scope = accessScope === undefined ? {} : { accessScope };
  const decide: OwnerActing['decide'] = (action, resource, approval) => {
    const decision = authorize(principal, action, resource, { ...scope, approval, now });
    if (decision.kind === 'deny') throw new OwnerLost();
    return decision;
  };
  return {
    actor: ownerActor(row),
    principal,
    now,
    decide,
    authorize(action, resource, inputs = {}) {
      const decision = authorize(principal, action, resource, { ...scope, ...inputs, now });
      if (decision.kind === 'deny') throw new OwnerLost();
      if (decision.kind === 'require_approval') {
        throw new HttpError('approval_required', 'This action needs an approved request first.');
      }
      return decision;
    },
  };
}

// The triggers read app.actor: scheduled_by (re-checked at claim), the requester of an approval
// request and agent provenance all have to name the owner, exactly as if they had acted themselves.
export async function actAs(trx: TenantDb, actor: Actor): Promise<void> {
  await sql`select set_config('app.actor', ${actorSetting(actor)}, true)`.execute(trx);
}
