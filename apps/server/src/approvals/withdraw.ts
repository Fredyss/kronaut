import { defineRoute } from '@kronaut/contract';
import type { Principal } from '@kronaut/core';
import { HttpError } from '../http/errors.ts';
import { type BoundRoute, bindRoute } from '../http/types.ts';
import { pathId } from '../posts/params.ts';
import { ApprovalRequestSchema, readRequest } from './dto.ts';
import { closeRequest, type LockedRequest, lockRequest, RequestParams } from './locked.ts';

export const withdrawRoute = defineRoute({
  id: 'approvals.withdraw',
  method: 'POST',
  path: '/v1/workspaces/:workspaceId/approval-requests/:requestId/withdraw',
  auth: ['session', 'grant'],
  action: 'posts:submit',
  params: RequestParams,
  response: ApprovalRequestSchema,
  idempotency: true,
  summary: 'Withdraw an approval request',
  description:
    'The requester closes their own open request as withdrawn; the post goes back to an editable draft.',
  tags: ['approvals'],
});

function isRequester(principal: Principal | null, request: LockedRequest): boolean {
  if (principal?.kind === 'user') return request.requested_by_user_id === principal.userId;
  if (principal?.kind === 'grant') return request.requested_by_grant_id === principal.grantId;
  return false;
}

export function withdrawRoutes(): BoundRoute[] {
  return [
    bindRoute(withdrawRoute, async ({ params }, ctx) => {
      const workspaceId = pathId('workspace', params.workspaceId);
      const requestId = pathId('approvalRequest', params.requestId);
      const request = await ctx.tenant(async (trx) => {
        const { locked, units, request } = await lockRequest(trx, workspaceId, requestId);
        ctx.authorize('posts:submit', { workspaceId, postId: locked.id, units });
        if (!isRequester(ctx.principal, request)) {
          throw new HttpError('forbidden', 'Only the requester can withdraw an approval request.');
        }
        if (request.state !== 'open') {
          throw new HttpError('conflict', 'The approval request is already closed.');
        }
        await closeRequest(trx, workspaceId, { requestId }, { state: 'withdrawn' });
        return await readRequest(trx, workspaceId, requestId);
      });
      return { body: request };
    }),
  ];
}
