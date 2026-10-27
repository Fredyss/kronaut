import type { Temporal } from 'temporal-polyfill';
import { type Action, isGrantableScope, READ_SET, SELF_ACTION } from './actions.ts';
import { type Role, roleAllows } from './roles.ts';

export const POLICY_VERSION = 1;
export const APPROVAL_REAUTH_MAX_AGE_MS = 12 * 60 * 60 * 1000;

const REVIEWER_ACTIONS: ReadonlySet<Action> = new Set<Action>([
  'posts:read',
  'media:read',
  'comments:read',
  'comments:write',
  'approvals:decide',
]);

export interface UserPrincipal {
  readonly kind: 'user';
  readonly userId: string;
  readonly workspaceId: string;
  readonly role: Role;
  readonly canApprove: boolean;
  readonly restricted: boolean;
  readonly authenticatedAt: Temporal.Instant;
}

export interface GrantPrincipal {
  readonly kind: 'grant';
  readonly grantId: string;
  readonly workspaceId: string;
  readonly sponsorUserId: string;
  readonly sponsorRole: Role | null;
  readonly scopes: readonly string[];
  readonly restricted: boolean;
}

export interface ReviewerPrincipal {
  readonly kind: 'reviewer';
  readonly reviewerId: string;
  readonly workspaceId: string;
  readonly postIds: readonly string[];
  readonly canDecide: boolean;
  readonly otpVerified: boolean;
}

export interface SystemPrincipal {
  readonly kind: 'system';
  readonly workspaceId: string;
}

export interface CliPrincipal {
  readonly kind: 'cli';
}

export interface SessionPrincipal {
  readonly kind: 'session';
  readonly userId: string;
}

export type Principal =
  | UserPrincipal
  | GrantPrincipal
  | ReviewerPrincipal
  | SystemPrincipal
  | CliPrincipal
  | SessionPrincipal;

export interface ScopeUnit {
  readonly brandId?: string;
  readonly locationId?: string;
  readonly socialAccountId?: string;
}

export interface Resource {
  readonly workspaceId: string;
  readonly postId?: string;
  readonly units?: readonly ScopeUnit[];
}

export interface AccessScope {
  readonly brandIds: readonly string[];
  readonly locationIds: readonly string[];
  readonly socialAccountIds: readonly string[];
}

export type ApprovalStatus = 'exempt' | 'approved' | 'missing';

export interface AuthorizeInputs {
  readonly now: Temporal.Instant;
  readonly accessScope?: AccessScope;
  readonly approval?: ApprovalStatus;
  readonly isRequester?: boolean;
  readonly allowSelfApproval?: boolean;
}

export type DenyCode =
  | 'workspace_mismatch'
  | 'not_permitted'
  | 'never_grantable'
  | 'scope_missing'
  | 'sponsor_inactive'
  | 'out_of_scope'
  | 'not_approver'
  | 'self_approval'
  | 'reauth_required'
  | 'otp_required'
  | 'not_in_review_set';

export type Decision =
  | { readonly kind: 'allow' }
  | { readonly kind: 'allow_scoped'; readonly scope: AccessScope }
  | { readonly kind: 'deny'; readonly code: DenyCode }
  | { readonly kind: 'require_approval' };

const ALLOW: Decision = { kind: 'allow' };
const REQUIRE_APPROVAL: Decision = { kind: 'require_approval' };

function deny(code: DenyCode): Decision {
  return { kind: 'deny', code };
}

function covered(unit: ScopeUnit, scope: AccessScope): boolean {
  return (
    (unit.brandId !== undefined && scope.brandIds.includes(unit.brandId)) ||
    (unit.locationId !== undefined && scope.locationIds.includes(unit.locationId)) ||
    (unit.socialAccountId !== undefined && scope.socialAccountIds.includes(unit.socialAccountId))
  );
}

function isEmptyScope(scope: AccessScope): boolean {
  return (
    scope.brandIds.length === 0 &&
    scope.locationIds.length === 0 &&
    scope.socialAccountIds.length === 0
  );
}

function scopeDecision(
  restricted: boolean,
  action: Action,
  resource: Resource,
  inputs: AuthorizeInputs,
): Decision {
  if (!restricted) return ALLOW;
  const scope = inputs.accessScope;
  if (scope === undefined || isEmptyScope(scope)) return deny('out_of_scope');
  const units = resource.units ?? [];
  if (units.length === 0) {
    return READ_SET.has(action) && resource.postId === undefined
      ? { kind: 'allow_scoped', scope }
      : deny('out_of_scope');
  }
  return units.every((u) => covered(u, scope)) ? ALLOW : deny('out_of_scope');
}

function userDecision(
  principal: UserPrincipal,
  action: Action,
  resource: Resource,
  inputs: AuthorizeInputs,
): Decision {
  if (action === 'approvals:decide') {
    if (!principal.canApprove) return deny('not_approver');
    if (inputs.isRequester !== false && inputs.allowSelfApproval !== true) {
      return deny('self_approval');
    }
    const age = inputs.now.epochMilliseconds - principal.authenticatedAt.epochMilliseconds;
    if (age > APPROVAL_REAUTH_MAX_AGE_MS) return deny('reauth_required');
  } else if (!roleAllows(principal.role, action)) {
    return deny('not_permitted');
  }
  return scopeDecision(principal.restricted, action, resource, inputs);
}

function grantDecision(
  principal: GrantPrincipal,
  action: Action,
  resource: Resource,
  inputs: AuthorizeInputs,
): Decision {
  if (!isGrantableScope(action)) return deny('never_grantable');
  if (!principal.scopes.includes(action)) return deny('scope_missing');
  if (principal.sponsorRole === null) return deny('sponsor_inactive');
  if (!roleAllows(principal.sponsorRole, action)) return deny('not_permitted');
  return scopeDecision(principal.restricted, action, resource, inputs);
}

function reviewerDecision(
  principal: ReviewerPrincipal,
  action: Action,
  resource: Resource,
): Decision {
  if (!REVIEWER_ACTIONS.has(action)) return deny('not_permitted');
  if (resource.postId === undefined || !principal.postIds.includes(resource.postId)) {
    return deny('not_in_review_set');
  }
  if (action === 'approvals:decide') {
    if (!principal.canDecide) return deny('not_approver');
    if (!principal.otpVerified) return deny('otp_required');
  }
  return ALLOW;
}

function baseDecision(
  principal: Exclude<Principal, CliPrincipal | SessionPrincipal>,
  action: Action,
  resource: Resource,
  inputs: AuthorizeInputs,
): Decision {
  switch (principal.kind) {
    case 'user':
      return userDecision(principal, action, resource, inputs);
    case 'grant':
      return grantDecision(principal, action, resource, inputs);
    case 'reviewer':
      return reviewerDecision(principal, action, resource);
    case 'system':
      return deny('not_permitted');
  }
}

function principalDecision(
  principal: Principal,
  action: Action,
  resource: Resource | null,
  inputs: AuthorizeInputs,
): Decision {
  if (principal.kind === 'cli') {
    return action === 'approvals:decide' ? deny('not_approver') : ALLOW;
  }
  if (
    principal.kind === 'session' ||
    resource === null ||
    principal.workspaceId !== resource.workspaceId
  ) {
    return deny('workspace_mismatch');
  }
  return baseDecision(principal, action, resource, inputs);
}

export function authorize(
  principal: Principal,
  action: Action,
  resource: Resource | null,
  inputs: AuthorizeInputs,
): Decision {
  if (action === SELF_ACTION) {
    if (principal.kind === 'session') return ALLOW;
    return deny(principal.kind === 'grant' ? 'never_grantable' : 'not_permitted');
  }
  const decision = principalDecision(principal, action, resource, inputs);
  if (decision.kind !== 'allow') return decision;
  const cleared =
    inputs.approval === 'approved' || (inputs.approval === 'exempt' && principal.kind !== 'grant');
  if (action === 'posts:schedule' && !cleared) return REQUIRE_APPROVAL;
  return decision;
}
