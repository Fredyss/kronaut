import { defineRoute } from '@kronaut/contract';
import type { UserPrincipal } from '@kronaut/core';
import { toDate } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import * as z from 'zod';
import { HttpError } from '../http/errors.ts';
import { type BoundRoute, bindRoute, type RequestContext } from '../http/types.ts';
import { pathId } from '../posts/params.ts';
import { postApprovedEvent, postRejectedEvent } from '../webhooks/events.ts';
import { ApprovalRequestSchema, readRequest } from './dto.ts';
import {
  announce,
  closeRequest,
  type LockedRequest,
  lockRequest,
  RequestParams,
} from './locked.ts';
import { type EffectivePolicy, effectivePolicy } from './policy.ts';

const DECISION_UNIQUE = 'approval_decisions_workspace_id_request_id_user_id_key';

export const decideRoute = defineRoute({
  id: 'approvals.decide',
  method: 'POST',
  path: '/v1/workspaces/:workspaceId/approval-requests/:requestId/decisions',
  auth: ['session'],
  action: 'approvals:decide',
  params: RequestParams,
  body: z.strictObject({ decision: z.enum(['approve', 'reject', 'request_changes']) }),
  response: ApprovalRequestSchema,
  idempotency: true,
  summary: 'Decide an approval request',
  description:
    "Records the caller's decision on an open request. Approve closes it as approved once the qualifying approvals reach the greater of the request's and the live policy's count; reject and request_changes close it as rejected.",
  tags: ['approvals'],
});

type Decision = z.output<typeof decideRoute.body>['decision'];

interface Deciding {
  readonly workspaceId: string;
  readonly request: LockedRequest;
  readonly policy: EffectivePolicy;
  readonly allowSelf: boolean;
}

function actingUser(ctx: RequestContext): UserPrincipal {
  const principal = ctx.principal;
  if (principal?.kind !== 'user')
    throw new HttpError('internal', 'No user is bound to this request.');
  return principal;
}

function snapshotAllowsSelf(snapshot: unknown): boolean {
  return (
    typeof snapshot === 'object' &&
    snapshot !== null &&
    (snapshot as { allow_self_approval?: unknown }).allow_self_approval === true
  );
}

// A key acts for its sponsor, so its sponsor approving the key's request is self-approval.
function requesterOf(request: LockedRequest): string | null {
  return request.requested_by_user_id ?? request.requested_by_sponsor_user_id;
}

function isDuplicate(err: unknown): boolean {
  const { code, constraint } = err as { code?: unknown; constraint?: unknown };
  return code === '23505' && constraint === DECISION_UNIQUE;
}

async function insertDecision(
  trx: TenantDb,
  { workspaceId, request }: Deciding,
  user: UserPrincipal,
  decision: Decision,
): Promise<void> {
  try {
    await trx
      .insertInto('approval_decisions')
      .values({
        workspace_id: workspaceId,
        request_id: request.id,
        decision,
        approver_kind: 'user',
        user_id: user.userId,
        session_reauth_at: toDate(user.authenticatedAt),
      })
      .execute();
  } catch (err) {
    if (isDuplicate(err)) throw new HttpError('conflict', 'You already decided this request.');
    throw err;
  }
}

async function qualifyingApprovals(trx: TenantDb, d: Deciding): Promise<number> {
  let query = trx
    .selectFrom('approval_decisions')
    .select((eb) => eb.fn.countAll<string>().as('n'))
    .where('workspace_id', '=', d.workspaceId)
    .where('request_id', '=', d.request.id)
    .where('decision', '=', 'approve');
  if (!d.allowSelf) {
    query = query.where((eb) =>
      eb.or([
        eb('approver_kind', '=', 'reviewer'),
        eb('user_id', 'is distinct from', requesterOf(d.request)),
      ]),
    );
  }
  const { n } = await query.executeTakeFirstOrThrow();
  return Number(n);
}

async function settle(trx: TenantDb, d: Deciding, decision: Decision): Promise<void> {
  const ref = { postId: d.request.post_id, requestId: d.request.id };
  if (decision !== 'approve') {
    await closeRequest(trx, d.workspaceId, { requestId: d.request.id }, { state: 'rejected' });
    await announce(trx, postRejectedEvent(d.workspaceId, ref));
    return;
  }
  const needed = Math.max(d.request.required_approvals, d.policy.requiredApprovals);
  if ((await qualifyingApprovals(trx, d)) < needed) return;
  await closeRequest(trx, d.workspaceId, { requestId: d.request.id }, { state: 'approved' });
  await announce(trx, postApprovedEvent(d.workspaceId, ref));
}

export function decideRoutes(): BoundRoute[] {
  return [
    bindRoute(decideRoute, async ({ params, body }, ctx) => {
      const workspaceId = pathId('workspace', params.workspaceId);
      const requestId = pathId('approvalRequest', params.requestId);
      const request = await ctx.tenant(async (trx) => {
        const { locked, units, request } = await lockRequest(trx, workspaceId, requestId);
        const user = actingUser(ctx);
        const policy = await effectivePolicy(trx, workspaceId, locked.brand_id);
        const allowSelf = policy.allowSelfApproval && snapshotAllowsSelf(request.policy_snapshot);
        ctx.authorize(
          'approvals:decide',
          { workspaceId, postId: locked.id, units },
          {
            isRequester: requesterOf(request) === user.userId,
            allowSelfApproval: allowSelf,
          },
        );
        if (request.state !== 'open') {
          throw new HttpError('conflict', 'The approval request is already closed.');
        }
        const deciding = { workspaceId, request, policy, allowSelf };
        await insertDecision(trx, deciding, user, body.decision);
        await settle(trx, deciding, body.decision);
        return await readRequest(trx, workspaceId, requestId);
      });
      return { body: request };
    }),
  ];
}
