import { detailCodes, errorCode } from '../api.ts';
import { issueMessage } from '../compose/issues.ts';
import { apiErrorMessage, m } from '../i18n.ts';
import { type ApprovalRequest, denyCode, hasDetail } from './queries.ts';

export function stateLabel(state: ApprovalRequest['state']): string {
  switch (state) {
    case 'open':
      return m.approval_state_open();
    case 'approved':
      return m.approval_state_approved();
    case 'rejected':
      return m.approval_state_rejected();
    case 'voided':
      return m.approval_state_voided();
    case 'withdrawn':
      return m.approval_state_withdrawn();
    case 'revoked':
      return m.approval_state_revoked();
  }
}

export function voidReasonLabel(reason: NonNullable<ApprovalRequest['voidReason']>): string {
  switch (reason) {
    case 'content_changed':
      return m.approval_void_content();
    case 'destinations_changed':
      return m.approval_void_destinations();
    case 'schedule_changed':
      return m.approval_void_schedule();
    case 'policy_changed':
      return m.approval_void_policy();
  }
}

export function approvalErrorMessage(error: unknown, onConflict = m.approval_error_closed): string {
  if (hasDetail(error, 'outside_approved_schedule')) return m.approval_outside_schedule();
  switch (denyCode(error)) {
    case 'approval_required':
      return m.approval_changed_after();
    case 'not_approver':
      return m.approval_not_approver();
    case 'self_approval':
      return m.approval_self();
    case 'reauth_required':
      return m.approval_reauth_body();
    case 'conflict':
      return onConflict();
    case 'version_conflict':
      return m.compose_error_conflict();
  }
  const detail = detailCodes(error)[0];
  return detail === undefined ? apiErrorMessage(errorCode(error)) : issueMessage(detail);
}
