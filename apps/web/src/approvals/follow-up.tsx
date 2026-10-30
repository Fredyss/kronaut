import { postsRequestApproval, postsSchedule } from '@kronaut/sdk';
import { Button } from '@kronaut/ui';
import { useState } from 'react';
import { errorCode } from '../api.ts';
import type { ScheduleWhen } from '../compose/submit.ts';
import { useApiClient } from '../context.ts';
import { m } from '../i18n.ts';
import { type PostScope, useApprovalCall } from './actions.ts';
import { approvalErrorMessage } from './messages.ts';
import { approvalBody } from './queries.ts';
import { WhenForm } from './when-form.tsx';

interface FollowUpProps {
  readonly scope: PostScope;
  readonly version: number;
}

function messageOf(error: unknown): string | null {
  return error === null ? null : approvalErrorMessage(error, m.approval_error_waiting);
}

export function RequestApproval({ scope, version, again }: FollowUpProps & { again: boolean }) {
  const client = useApiClient();
  const action = useApprovalCall(scope);
  const [open, setOpen] = useState(false);
  const label = again ? m.approval_request_again() : m.compose_request_approval();
  if (!open) {
    return (
      <div>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          {label}
        </Button>
      </div>
    );
  }
  const submit = (when: ScheduleWhen, note: string) => {
    const body = approvalBody(version, when, note);
    action.mutate({
      fingerprint: JSON.stringify({ request: scope.postId, body }),
      call: (headers) => postsRequestApproval({ client, path: scope, body, headers }),
    });
  };
  return (
    <WhenForm
      request
      pending={action.isPending}
      error={messageOf(action.error)}
      onSubmit={submit}
      onCancel={() => setOpen(false)}
    />
  );
}

function useSchedule(scope: PostScope, version: number) {
  const client = useApiClient();
  const action = useApprovalCall(scope);
  const run = (when: ScheduleWhen) => {
    const body = { expectedVersion: version, ...when };
    action.mutate({
      fingerprint: JSON.stringify({ schedule: scope.postId, body }),
      call: (headers) => postsSchedule({ client, path: scope, body, headers }),
    });
  };
  const changed = errorCode(action.error) === 'approval_required';
  return { action, run, changed };
}

function Changed({ scope, version }: FollowUpProps) {
  return (
    <div className="flex flex-col gap-2">
      <p role="alert" className="text-destructive text-sm">
        {m.approval_changed_after()}
      </p>
      <RequestApproval scope={scope} version={version} again />
    </div>
  );
}

export function ScheduleApproved({
  scope,
  version,
  slot,
}: FollowUpProps & { slot: { readonly local: string; readonly tz: string } }) {
  const { action, run, changed } = useSchedule(scope, version);
  if (changed) return <Changed scope={scope} version={version} />;
  return (
    <div className="flex flex-col gap-2">
      <div>
        <Button
          size="sm"
          disabled={action.isPending}
          onClick={() => run({ mode: 'instant', scheduleLocal: slot.local, scheduleTz: slot.tz })}
        >
          {m.approval_schedule_approved()}
        </Button>
      </div>
      {action.error === null ? null : (
        <p role="alert" className="text-destructive text-sm">
          {messageOf(action.error)}
        </p>
      )}
    </div>
  );
}

export function ScheduleUnbound({ scope, version }: FollowUpProps) {
  const { action, run, changed } = useSchedule(scope, version);
  const [open, setOpen] = useState(false);
  if (changed) return <Changed scope={scope} version={version} />;
  if (!open) {
    return (
      <div>
        <Button size="sm" onClick={() => setOpen(true)}>
          {m.compose_schedule()}
        </Button>
      </div>
    );
  }
  return (
    <WhenForm
      request={false}
      pending={action.isPending}
      error={messageOf(action.error)}
      onSubmit={run}
      onCancel={() => setOpen(false)}
    />
  );
}
