import { useFormat, useWallFormat } from '../format.ts';
import { m } from '../i18n.ts';
import { stateLabel, voidReasonLabel } from './messages.ts';
import type { ApprovalRequest } from './queries.ts';

type Decision = ApprovalRequest['decisions'][number]['decision'];

function decisionLabel(decision: Decision): string {
  if (decision === 'approve') return m.approval_state_approved();
  if (decision === 'reject') return m.approval_state_rejected();
  return m.approval_changes_requested();
}

function requesterLine(request: ApprovalRequest, meId: string, when: string): string {
  if (request.requestedBy.kind === 'grant') return m.approval_requested_by_key({ when });
  return request.requestedBy.id === meId
    ? m.approval_requested_by_you({ when })
    : m.approval_requested_by_member({ when });
}

export function boundSlot(request: ApprovalRequest) {
  const slot = request.destinations.find((d) => d.scheduleBound);
  if (slot?.shownLocal == null || slot.shownTz === null) return null;
  return { local: slot.shownLocal, tz: slot.shownTz, tolerance: slot.toleranceMin ?? 0 };
}

function BoundLine({ request }: { readonly request: ApprovalRequest }) {
  const wall = useWallFormat();
  const slot = boundSlot(request);
  if (slot === null) return null;
  return (
    <p className="text-sm">
      {m.approval_bound({ when: wall(slot.local), tz: slot.tz })}
      {slot.tolerance === 0 ? null : ` ${m.approval_tolerance({ count: slot.tolerance })}`}
    </p>
  );
}

export function RequestSummary({
  request,
  meId,
}: {
  readonly request: ApprovalRequest;
  readonly meId: string;
}) {
  const format = useFormat(null);
  const approved = request.decisions.filter((d) => d.decision === 'approve').length;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-full bg-secondary px-2 py-0.5 font-medium text-sm">
          {stateLabel(request.state)}
        </span>
        <span className="text-muted-foreground text-sm">
          {m.approval_progress({ approved, count: request.requiredApprovals })}
        </span>
      </div>
      {request.voidReason === null ? null : (
        <p className="text-sm">{voidReasonLabel(request.voidReason)}</p>
      )}
      <p className="text-muted-foreground text-sm">
        {requesterLine(request, meId, format(request.createdAt))}
      </p>
      {request.note === null ? null : (
        <blockquote className="whitespace-pre-wrap break-words border-l-2 pl-3 text-sm">
          {request.note}
        </blockquote>
      )}
      <BoundLine request={request} />
      {request.decisions.length === 0 ? null : (
        <ul className="flex flex-col gap-1 text-muted-foreground text-sm">
          {request.decisions.map((d) => (
            <li key={`${d.userId}|${d.createdAt}`}>
              {decisionLabel(d.decision)} · {format(d.createdAt)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
