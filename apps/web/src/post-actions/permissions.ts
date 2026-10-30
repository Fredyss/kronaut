export const DRAFT_ROLES: ReadonlySet<string> = new Set([
  'owner',
  'admin',
  'editor',
  'contributor',
]);
export const CANCEL_ROLES: ReadonlySet<string> = new Set(['owner', 'admin', 'editor']);
const CANCELED_ON_DELETE: ReadonlySet<string> = new Set([
  'scheduled',
  'awaiting_manual',
  'blocked',
  'failed',
]);

export function canDuplicate(role: string): boolean {
  return DRAFT_ROLES.has(role);
}

export function canDelete(role: string, destinations: readonly { readonly state: string }[]) {
  if (!DRAFT_ROLES.has(role)) return false;
  return CANCEL_ROLES.has(role) || !destinations.some((d) => CANCELED_ON_DELETE.has(d.state));
}
