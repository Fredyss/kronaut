import { approvalsWithdraw } from '@kronaut/sdk';
import { Button } from '@kronaut/ui';
import { useApiClient } from '../context.ts';
import { m } from '../i18n.ts';
import { type Decision, type PostScope, useApprovalCall, useDecide } from './actions.ts';
import { approvalErrorMessage } from './messages.ts';
import { PasswordDialog } from './password-dialog.tsx';

const DECISIONS: readonly [Decision, () => string][] = [
  ['approve', () => m.approval_approve()],
  ['reject', () => m.approval_reject()],
  ['request_changes', () => m.approval_request_changes()],
];

function ErrorLine({ error }: { readonly error: unknown }) {
  if (error === null) return null;
  return (
    <p role="alert" className="text-destructive text-sm">
      {approvalErrorMessage(error)}
    </p>
  );
}

export function DecideActions({
  scope,
  requestId,
}: {
  readonly scope: PostScope;
  readonly requestId: string;
}) {
  const { decide, action, dialog } = useDecide(scope, requestId);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {DECISIONS.map(([decision, label], index) => (
          <Button
            key={decision}
            size="sm"
            variant={index === 0 ? 'default' : 'outline'}
            disabled={action.isPending || dialog !== null}
            onClick={() => decide(decision)}
          >
            {label()}
          </Button>
        ))}
      </div>
      {dialog === null ? <ErrorLine error={action.error} /> : null}
      {dialog === null ? null : (
        <PasswordDialog
          pending={dialog.pending}
          error={dialog.error}
          onConfirm={dialog.confirm}
          onClose={dialog.close}
        />
      )}
    </div>
  );
}

export function WithdrawAction({
  scope,
  requestId,
}: {
  readonly scope: PostScope;
  readonly requestId: string;
}) {
  const client = useApiClient();
  const action = useApprovalCall(scope);
  const withdraw = () =>
    action.mutate({
      fingerprint: JSON.stringify({ requestId, withdraw: true }),
      call: (headers) =>
        approvalsWithdraw({
          client,
          path: { workspaceId: scope.workspaceId, requestId },
          headers,
        }),
    });
  return (
    <div className="flex flex-col gap-2">
      <div>
        <Button size="sm" variant="outline" disabled={action.isPending} onClick={withdraw}>
          {m.approval_withdraw()}
        </Button>
      </div>
      <ErrorLine error={action.error} />
    </div>
  );
}
