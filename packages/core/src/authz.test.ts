import { Temporal } from 'temporal-polyfill';
import { describe, expect, it } from 'vitest';
import {
  ACTIONS,
  type Action,
  GRANTABLE_SCOPES,
  isAction,
  isGrantableScope,
  NEVER_GRANTABLE_ACTIONS,
  SELF_ACTION,
} from './actions.ts';
import {
  type AuthorizeInputs,
  authorize,
  type GrantPrincipal,
  type Resource,
  type ReviewerPrincipal,
  type SessionPrincipal,
  type UserPrincipal,
} from './authz.ts';
import { ROLES, type Role, roleAllows } from './roles.ts';

const NOW = Temporal.Instant.from('2026-10-21T12:00:00Z');
const WS = 'ws-1';
const RES: Resource = { workspaceId: WS };
const IN: AuthorizeInputs = { now: NOW, approval: 'exempt', isRequester: false };

function user(role: Role, extra: Partial<UserPrincipal> = {}): UserPrincipal {
  return {
    kind: 'user',
    userId: 'u-1',
    workspaceId: WS,
    role,
    canApprove: false,
    restricted: false,
    authenticatedAt: NOW.subtract({ hours: 1 }),
    ...extra,
  };
}

function grant(scopes: readonly string[], extra: Partial<GrantPrincipal> = {}): GrantPrincipal {
  return {
    kind: 'grant',
    grantId: 'g-1',
    workspaceId: WS,
    sponsorUserId: 'u-1',
    sponsorRole: 'owner',
    scopes,
    restricted: false,
    ...extra,
  };
}

function reviewer(extra: Partial<ReviewerPrincipal> = {}): ReviewerPrincipal {
  return {
    kind: 'reviewer',
    reviewerId: 'r-1',
    workspaceId: WS,
    postIds: ['p-1'],
    canDecide: true,
    otpVerified: true,
    ...extra,
  };
}

describe('vocabulary', () => {
  it('freezes 15 grantable scopes and keeps them disjoint from never-grantable actions', () => {
    expect(GRANTABLE_SCOPES).toHaveLength(15);
    const grantable = new Set<string>(GRANTABLE_SCOPES);
    for (const a of NEVER_GRANTABLE_ACTIONS) expect(grantable.has(a)).toBe(false);
    expect(new Set(ACTIONS).size).toBe(ACTIONS.length);
  });

  it('recognises actions and scopes', () => {
    expect(isAction('posts:draft')).toBe(true);
    expect(isAction('posts:write')).toBe(false);
    expect(isGrantableScope('posts:schedule')).toBe(true);
    expect(isGrantableScope('approvals:decide')).toBe(false);
  });

  it('gives no role approvals:decide and only owner billing:manage', () => {
    for (const role of ROLES) {
      expect(roleAllows(role, 'approvals:decide')).toBe(false);
      expect(roleAllows(role, 'billing:manage')).toBe(role === 'owner');
    }
  });

  it('keeps audit:read to owner and admin', () => {
    expect(ROLES.filter((r) => roleAllows(r, 'audit:read'))).toEqual(['owner', 'admin']);
  });
});

describe('users', () => {
  it.each<[Role, Action, boolean]>([
    ['owner', 'channels:connect', true],
    ['admin', 'policy:write', true],
    ['editor', 'posts:schedule', true],
    ['editor', 'channels:connect', false],
    ['contributor', 'posts:submit', true],
    ['contributor', 'posts:schedule', false],
    ['viewer', 'posts:read', true],
    ['viewer', 'posts:draft', false],
    ['client', 'comments:write', true],
    ['client', 'analytics:read', false],
  ])('%s %s → %s', (role, action, allowed) => {
    expect(authorize(user(role), action, RES, IN).kind).toBe(allowed ? 'allow' : 'deny');
  });

  it('denies across workspaces', () => {
    expect(authorize(user('owner'), 'posts:read', { workspaceId: 'other' }, IN)).toEqual({
      kind: 'deny',
      code: 'workspace_mismatch',
    });
  });

  it('requires approval to schedule unless approved or exempt', () => {
    const u = user('editor');
    expect(authorize(u, 'posts:schedule', RES, { now: NOW, approval: 'missing' }).kind).toBe(
      'require_approval',
    );
    expect(authorize(u, 'posts:schedule', RES, { now: NOW }).kind).toBe('require_approval');
    expect(authorize(u, 'posts:schedule', RES, { now: NOW, approval: 'approved' }).kind).toBe(
      'allow',
    );
  });

  it('never treats a grant as exempt from approval', () => {
    const g = grant(['posts:schedule']);
    expect(authorize(g, 'posts:schedule', RES, IN).kind).toBe('require_approval');
    expect(authorize(g, 'posts:schedule', RES, { ...IN, approval: 'approved' }).kind).toBe('allow');
  });

  it('puts deny ahead of require_approval', () => {
    expect(
      authorize(user('viewer'), 'posts:schedule', RES, { now: NOW, approval: 'missing' }),
    ).toEqual({ kind: 'deny', code: 'not_permitted' });
  });
});

describe('approvals', () => {
  it('needs the flag, not a role', () => {
    expect(authorize(user('owner'), 'approvals:decide', RES, IN)).toEqual({
      kind: 'deny',
      code: 'not_approver',
    });
    expect(authorize(user('client', { canApprove: true }), 'approvals:decide', RES, IN).kind).toBe(
      'allow',
    );
  });

  it('needs authentication within 12 h', () => {
    const fresh = user('editor', {
      canApprove: true,
      authenticatedAt: NOW.subtract({ hours: 12 }),
    });
    const stale = user('editor', {
      canApprove: true,
      authenticatedAt: NOW.subtract({ hours: 12, seconds: 1 }),
    });
    expect(authorize(fresh, 'approvals:decide', RES, IN).kind).toBe('allow');
    expect(authorize(stale, 'approvals:decide', RES, IN)).toEqual({
      kind: 'deny',
      code: 'reauth_required',
    });
  });

  it('treats an unknown requester as the requester', () => {
    const u = user('editor', { canApprove: true });
    expect(authorize(u, 'approvals:decide', RES, { now: NOW })).toEqual({
      kind: 'deny',
      code: 'self_approval',
    });
    expect(
      authorize(u, 'approvals:decide', RES, {
        now: NOW,
        isRequester: true,
        allowSelfApproval: true,
      }).kind,
    ).toBe('allow');
  });
});

describe('grants', () => {
  it('cannot hold or use never-grantable actions', () => {
    for (const a of NEVER_GRANTABLE_ACTIONS) {
      expect(authorize(grant([a]), a, RES, IN)).toEqual({ kind: 'deny', code: 'never_grantable' });
    }
  });

  it('intersects scopes with the sponsor’s current role', () => {
    expect(authorize(grant(['posts:draft']), 'posts:read', RES, IN)).toEqual({
      kind: 'deny',
      code: 'scope_missing',
    });
    expect(
      authorize(
        grant(['posts:schedule'], { sponsorRole: 'contributor' }),
        'posts:schedule',
        RES,
        IN,
      ),
    ).toEqual({ kind: 'deny', code: 'not_permitted' });
    expect(authorize(grant(['posts:read'], { sponsorRole: null }), 'posts:read', RES, IN)).toEqual({
      kind: 'deny',
      code: 'sponsor_inactive',
    });
    expect(authorize(grant(['posts:draft']), 'posts:draft', RES, IN).kind).toBe('allow');
  });
});

describe('restricted resource scope', () => {
  const scoped: Resource = {
    workspaceId: WS,
    units: [{ brandId: 'b-1' }, { socialAccountId: 'a-2', brandId: 'b-9' }],
  };

  it('fails closed with no access rows', () => {
    expect(authorize(user('editor', { restricted: true }), 'posts:draft', scoped, IN)).toEqual({
      kind: 'deny',
      code: 'out_of_scope',
    });
  });

  it('needs every unit covered', () => {
    const u = user('editor', { restricted: true });
    const partial = {
      ...IN,
      accessScope: { brandIds: ['b-1'], locationIds: [], socialAccountIds: [] },
    };
    const full = {
      ...IN,
      accessScope: { brandIds: ['b-1'], locationIds: [], socialAccountIds: ['a-2'] },
    };
    expect(authorize(u, 'posts:draft', scoped, partial).kind).toBe('deny');
    expect(authorize(u, 'posts:draft', scoped, full).kind).toBe('allow');
  });

  it('denies unit-less reads with no access rows', () => {
    const g = grant(['posts:read', 'audit:read'], { restricted: true });
    const none = { ...IN, accessScope: { brandIds: [], locationIds: [], socialAccountIds: [] } };
    expect(authorize(g, 'posts:read', RES, IN)).toEqual({ kind: 'deny', code: 'out_of_scope' });
    expect(authorize(g, 'audit:read', RES, none)).toEqual({ kind: 'deny', code: 'out_of_scope' });
  });

  it('scopes unit-less reads to the access rows and denies unit-less writes', () => {
    const g = grant(['posts:read', 'posts:draft'], { restricted: true });
    const scope = { brandIds: ['b-1'], locationIds: [], socialAccountIds: [] };
    const inputs = { ...IN, accessScope: scope };
    expect(authorize(g, 'posts:read', RES, inputs)).toEqual({ kind: 'allow_scoped', scope });
    expect(authorize(g, 'posts:draft', RES, inputs).kind).toBe('deny');
  });

  it('denies a post read that names no units', () => {
    const u = user('viewer', { restricted: true });
    const inputs = {
      ...IN,
      accessScope: { brandIds: ['b-1'], locationIds: [], socialAccountIds: [] },
    };
    expect(authorize(u, 'posts:read', { workspaceId: WS, postId: 'p-1' }, inputs)).toEqual({
      kind: 'deny',
      code: 'out_of_scope',
    });
  });
});

describe('reviewers, system and cli', () => {
  it('limits reviewers to their post set and needs OTP to decide', () => {
    const post: Resource = { workspaceId: WS, postId: 'p-1' };
    expect(authorize(reviewer(), 'approvals:decide', post, IN).kind).toBe('allow');
    expect(authorize(reviewer(), 'posts:read', { workspaceId: WS, postId: 'p-2' }, IN)).toEqual({
      kind: 'deny',
      code: 'not_in_review_set',
    });
    expect(authorize(reviewer({ otpVerified: false }), 'approvals:decide', post, IN)).toEqual({
      kind: 'deny',
      code: 'otp_required',
    });
    expect(authorize(reviewer(), 'posts:draft', post, IN)).toEqual({
      kind: 'deny',
      code: 'not_permitted',
    });
  });

  it('gives the system principal no authority of its own', () => {
    for (const a of ACTIONS) {
      expect(authorize({ kind: 'system', workspaceId: WS }, a, RES, IN).kind).toBe('deny');
    }
  });

  it('lets the cli do anything but approve', () => {
    expect(authorize({ kind: 'cli' }, 'channels:connect', RES, IN).kind).toBe('allow');
    expect(authorize({ kind: 'cli' }, 'approvals:decide', RES, IN).kind).toBe('deny');
  });
});

describe('self', () => {
  const session: SessionPrincipal = { kind: 'session', userId: 'u-1' };

  it('lets only a bare session act on its own account', () => {
    expect(authorize(session, SELF_ACTION, null, IN).kind).toBe('allow');
    expect(isGrantableScope(SELF_ACTION)).toBe(false);
    expect(authorize(grant([SELF_ACTION]), SELF_ACTION, null, IN)).toEqual({
      kind: 'deny',
      code: 'never_grantable',
    });
    for (const p of [user('owner'), reviewer(), { kind: 'cli' } as const]) {
      expect(authorize(p, SELF_ACTION, RES, IN)).toEqual({ kind: 'deny', code: 'not_permitted' });
    }
  });

  it('gives a bare session no workspace authority', () => {
    for (const a of ACTIONS) {
      if (a === SELF_ACTION) continue;
      expect(authorize(session, a, RES, IN)).toEqual({ kind: 'deny', code: 'workspace_mismatch' });
    }
    expect(authorize(user('owner'), 'posts:read', null, IN)).toEqual({
      kind: 'deny',
      code: 'workspace_mismatch',
    });
  });
});
