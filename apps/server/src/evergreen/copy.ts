import type { TenantDb } from '@kronaut/db';
import { clonePost } from '../posts/clone.ts';
import type { Schedule } from '../posts/freeze.ts';
import { lockCurrent } from '../posts/locks.ts';
import { actAs, ownerActing } from '../posts/owner.ts';
import {
  needsRequest,
  type OwnerEnv,
  type OwnerTurn,
  requestAsOwner,
  scheduleOrRequest,
} from '../posts/owner-schedule.ts';
import { postUnits } from '../posts/units.ts';
import type { PoolRow } from './pool.ts';

export interface SlotFill {
  readonly env: OwnerEnv;
  readonly accountId: string;
  readonly slot: Schedule;
  readonly pool: PoolRow;
}

async function copyOf(trx: TenantDb, fill: SlotFill): Promise<OwnerTurn> {
  const { env, pool, slot } = fill;
  const { workspaceId, now } = env;
  const acting = await ownerActing(trx, workspaceId, pool, now);
  await actAs(trx, acting.actor);
  const copyId = await clonePost(
    trx,
    { providers: env.providers, acting },
    {
      workspaceId,
      sourceId: pool.post_id,
      origin: 'duplicate',
      owner: pool,
      at: { local: slot.local, timezone: slot.tz },
      seriesId: null,
      accountId: fill.accountId,
    },
  );
  const locked = await lockCurrent(trx, workspaceId, copyId);
  const units = await postUnits(trx, workspaceId, locked);
  acting.decide('posts:schedule', { workspaceId, postId: copyId, units }, 'approved');
  return { env, acting, locked, units };
}

async function agentDirty(trx: TenantDb, turn: OwnerTurn): Promise<boolean> {
  const { agent_dirty } = await trx
    .selectFrom('posts')
    .select('agent_dirty')
    .where('workspace_id', '=', turn.env.workspaceId)
    .where('id', '=', turn.locked.id)
    .executeTakeFirstOrThrow();
  return agent_dirty;
}

export async function fillSlot(trx: TenantDb, fill: SlotFill) {
  const turn = await copyOf(trx, fill);
  const at = { scheduleLocal: fill.slot.local.toString(), scheduleTz: fill.slot.tz };
  const outcome = (await needsRequest(trx, turn, await agentDirty(trx, turn)))
    ? await requestAsOwner(trx, turn, at)
    : await scheduleOrRequest(trx, turn, at);
  await trx
    .insertInto('evergreen_runs')
    .values({
      workspace_id: fill.env.workspaceId,
      evergreen_post_id: fill.pool.post_id,
      social_account_id: fill.accountId,
      copy_post_id: turn.locked.id,
      slot_at: new Date(fill.slot.at.epochMilliseconds),
    })
    .execute();
  return outcome;
}
