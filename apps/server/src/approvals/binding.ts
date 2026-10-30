import type { ApprovalStatus, Schedule } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import { Temporal } from 'temporal-polyfill';
import { unprocessable } from '../http/issues.ts';
import { APPROVAL_UNBOUND, type Frozen } from '../posts/freeze.ts';
import type { DestinationUpdate } from '../publish/finalize.ts';

export interface ApprovedSlot {
  readonly shownLocal: string;
  readonly shownTz: string;
  readonly toleranceMin: number;
}

export interface Binding {
  readonly requestId: string;
  readonly contentHash: Buffer;
  readonly slot: ApprovedSlot | null;
}

export interface BindingTarget {
  readonly id: string;
  readonly kept: string | null;
}

export interface BindingInput {
  readonly workspaceId: string;
  readonly postId: string;
  readonly targets: readonly BindingTarget[];
  readonly frozen: readonly Frozen[];
  readonly schedules: ReadonlyMap<string, Pick<Schedule, 'local' | 'tz'>>;
  readonly fallback: ApprovalStatus;
}

export interface ResolvedApproval {
  readonly approval: ApprovalStatus;
  readonly bindings: ReadonlyMap<string, Binding>;
}

export function withinApprovedSchedule(
  schedule: Pick<Schedule, 'local' | 'tz'>,
  slot: ApprovedSlot,
): boolean {
  if (schedule.tz !== slot.shownTz) return false;
  const shown = Temporal.PlainDateTime.from(slot.shownLocal.replace(' ', 'T'));
  const seconds = schedule.local.since(shown, { largestUnit: 'second' }).total('second');
  return Math.abs(seconds) <= slot.toleranceMin * 60;
}

// A later request that was rejected, withdrawn or voided overrules an older approval of the same content.
async function newestApproved(trx: TenantDb, workspaceId: string, postId: string) {
  const newest = await trx
    .selectFrom('approval_requests')
    .select(['id', 'state'])
    .where('workspace_id', '=', workspaceId)
    .where('post_id', '=', postId)
    .orderBy('created_at', 'desc')
    .orderBy('id', 'desc')
    .limit(1)
    .executeTakeFirst();
  return newest?.state === 'approved' ? newest.id : null;
}

async function loadBindings(trx: TenantDb, input: BindingInput): Promise<Map<string, Binding>> {
  const newest = await newestApproved(trx, input.workspaceId, input.postId);
  const wanted = new Map(
    input.targets.flatMap((t) => {
      const requestId = t.kept ?? newest;
      return requestId === null ? [] : [[t.id, requestId] as const];
    }),
  );
  if (wanted.size === 0) return new Map();
  const rows = await trx
    .selectFrom('approval_request_destinations as ard')
    .innerJoin('approval_requests as r', (join) =>
      join.onRef('r.workspace_id', '=', 'ard.workspace_id').onRef('r.id', '=', 'ard.request_id'),
    )
    .select([
      'ard.request_id',
      'ard.destination_id',
      'ard.content_hash',
      'ard.shown_local',
      'ard.shown_tz',
      'ard.tolerance_min',
    ])
    .where('ard.workspace_id', '=', input.workspaceId)
    .where('r.state', '=', 'approved')
    .where('ard.destination_id', 'in', [...wanted.keys()])
    .where('ard.request_id', 'in', [...new Set(wanted.values())])
    .execute();
  return new Map(
    rows
      .filter((row) => wanted.get(row.destination_id) === row.request_id)
      .map((row) => [
        row.destination_id,
        {
          requestId: row.request_id,
          contentHash: row.content_hash,
          slot:
            row.shown_local === null || row.shown_tz === null || row.tolerance_min === null
              ? null
              : {
                  shownLocal: row.shown_local,
                  shownTz: row.shown_tz,
                  toleranceMin: row.tolerance_min,
                },
        },
      ]),
  );
}

export async function resolveApproval(
  trx: TenantDb,
  input: BindingInput,
): Promise<ResolvedApproval> {
  const loaded = await loadBindings(trx, input);
  const matched = input.frozen.every((f) => loaded.get(f.id)?.contentHash.equals(f.contentHash));
  if (!matched) return { approval: input.fallback, bindings: new Map() };
  const outside = [...loaded].some(([id, { slot }]) => {
    const schedule = input.schedules.get(id);
    return slot !== null && (schedule === undefined || !withinApprovedSchedule(schedule, slot));
  });
  if (outside && input.fallback === 'exempt') return { approval: 'exempt', bindings: new Map() };
  if (outside) {
    throw unprocessable([{ path: 'body.scheduleLocal', code: 'outside_approved_schedule' }]);
  }
  return { approval: 'approved', bindings: loaded };
}

export function bindingColumns(binding: Binding | undefined): DestinationUpdate {
  if (binding === undefined) return APPROVAL_UNBOUND;
  const { slot } = binding;
  return {
    approval_request_id: binding.requestId,
    approval_schedule_bound: slot !== null,
    approved_scheduled_local: slot?.shownLocal ?? null,
    approved_scheduled_tz: slot?.shownTz ?? null,
    approved_tolerance_min: slot?.toleranceMin ?? null,
  };
}
