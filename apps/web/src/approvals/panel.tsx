import { useQuery } from '@tanstack/react-query';
import { type Me, meQuery, type Post } from '../api.ts';
import { useApiClient } from '../context.ts';
import { m } from '../i18n.ts';
import type { PostScope } from './actions.ts';
import { RequestApproval, ScheduleApproved, ScheduleUnbound } from './follow-up.tsx';
import { DecideActions, WithdrawAction } from './open-actions.tsx';
import {
  type ApprovalRequest,
  approvalPolicyQuery,
  approvalRequestsQuery,
  approvalRequired,
  type PolicyResponse,
  policyForPost,
} from './queries.ts';
import { boundSlot, RequestSummary } from './summary.tsx';

interface Viewer {
  readonly me: Me;
  readonly canApprove: boolean;
  readonly policy: PolicyResponse | undefined;
}

function isRequester(request: ApprovalRequest, me: Me): boolean {
  return request.requestedBy.kind === 'user' && request.requestedBy.id === me.user.id;
}

function OpenActions({ scope, request, viewer }: Actions) {
  const own = isRequester(request, viewer.me);
  const selfAllowed =
    viewer.policy !== undefined && policyForPost(viewer.policy, null).allowSelfApproval;
  const canDecide = viewer.canApprove && (!own || selfAllowed);
  return (
    <>
      {canDecide ? <DecideActions scope={scope} requestId={request.id} /> : null}
      {own ? <WithdrawAction scope={scope} requestId={request.id} /> : null}
    </>
  );
}

interface Actions {
  readonly scope: PostScope;
  readonly post: Post;
  readonly request: ApprovalRequest;
  readonly viewer: Viewer;
}

function RequestActions(props: Actions) {
  const { scope, post, request } = props;
  if (request.state === 'open') return <OpenActions {...props} />;
  if (post.publishSummary !== 'draft') return null;
  if (request.state !== 'approved') {
    return <RequestApproval scope={scope} version={post.version} again />;
  }
  const slot = boundSlot(request);
  return slot === null ? (
    <ScheduleUnbound scope={scope} version={post.version} />
  ) : (
    <ScheduleApproved scope={scope} version={post.version} slot={slot} />
  );
}

export function ApprovalSection({ workspaceId, post }: { workspaceId: string; post: Post }) {
  const client = useApiClient();
  const me = useQuery(meQuery(client)).data;
  const requests = useQuery(approvalRequestsQuery(client, workspaceId, post.id));
  const policy = useQuery(approvalPolicyQuery(client, workspaceId)).data;
  if (me === undefined || requests.data === undefined) return null;
  const scope = { workspaceId, postId: post.id };
  const request = requests.data[0];
  if (request === undefined) {
    if (post.publishSummary !== 'draft' || !approvalRequired(policy, null)) return null;
    return <RequestApproval scope={scope} version={post.version} again={false} />;
  }
  const canApprove = me.workspaces.find((w) => w.id === workspaceId)?.canApprove === true;
  const viewer = { me, canApprove, policy };
  return (
    <section className="flex flex-col gap-3 rounded-xl border p-4">
      <h2 className="font-medium text-lg">{m.approval_title()}</h2>
      <RequestSummary request={request} meId={me.user.id} />
      <RequestActions scope={scope} post={post} request={request} viewer={viewer} />
    </section>
  );
}
