export const READ_SCOPES = [
  'brands:read',
  'channels:read',
  'groups:read',
  'posts:read',
  'media:read',
  'analytics:read',
  'comments:read',
  'audit:read',
] as const;

export const GRANTABLE_SCOPES = [
  ...READ_SCOPES,
  'posts:draft',
  'posts:submit',
  'posts:schedule',
  'posts:cancel',
  'media:write',
  'comments:write',
  'ai:generate',
] as const;
export type GrantableScope = (typeof GRANTABLE_SCOPES)[number];

export const NEVER_GRANTABLE_ACTIONS = [
  'approvals:decide',
  'channels:connect',
  'channels:disconnect',
  'channels:assign',
  'groups:write',
  'brands:write',
  'review_links:create',
  'members:manage',
  'grants:manage',
  'policy:write',
  'webhooks:manage',
  'settings:write',
  'billing:manage',
  'posts:unpublish',
  'instance:read',
] as const;

export const WORKSPACE_ACTIONS = [...GRANTABLE_SCOPES, ...NEVER_GRANTABLE_ACTIONS] as const;

export const SELF_ACTION = 'self';

export const ACTIONS = [...WORKSPACE_ACTIONS, SELF_ACTION] as const;
export type Action = (typeof ACTIONS)[number];

const ACTION_SET: ReadonlySet<string> = new Set(ACTIONS);
export const READ_SET: ReadonlySet<string> = new Set(READ_SCOPES);
const GRANTABLE_SET: ReadonlySet<string> = new Set(GRANTABLE_SCOPES);

export function isAction(value: string): value is Action {
  return ACTION_SET.has(value);
}

export function isGrantableScope(value: string): value is GrantableScope {
  return GRANTABLE_SET.has(value);
}
