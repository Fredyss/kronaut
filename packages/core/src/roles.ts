import { type Action, READ_SCOPES, WORKSPACE_ACTIONS } from './actions.ts';

export const ROLES = ['owner', 'admin', 'editor', 'contributor', 'viewer', 'client'] as const;
export type Role = (typeof ROLES)[number];

const MEMBER_READS = READ_SCOPES.filter((s) => s !== 'audit:read');

const ROLE_ACTIONS: Readonly<Record<Role, ReadonlySet<Action>>> = {
  owner: new Set(WORKSPACE_ACTIONS.filter((a) => a !== 'approvals:decide')),
  admin: new Set(
    WORKSPACE_ACTIONS.filter((a) => a !== 'approvals:decide' && a !== 'billing:manage'),
  ),
  editor: new Set<Action>([
    ...MEMBER_READS,
    'posts:draft',
    'posts:submit',
    'posts:schedule',
    'posts:cancel',
    'media:write',
    'comments:write',
    'ai:generate',
    'review_links:create',
  ]),
  contributor: new Set<Action>([
    ...MEMBER_READS,
    'posts:draft',
    'posts:submit',
    'media:write',
    'comments:write',
    'ai:generate',
  ]),
  viewer: new Set<Action>(MEMBER_READS),
  client: new Set<Action>([
    'brands:read',
    'channels:read',
    'posts:read',
    'media:read',
    'comments:read',
    'comments:write',
  ]),
};

export function roleAllows(role: Role, action: Action): boolean {
  return ROLE_ACTIONS[role].has(action);
}
