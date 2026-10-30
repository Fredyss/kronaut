const DRAFT_ROLES: ReadonlySet<string> = new Set(['owner', 'admin', 'editor', 'contributor']);
const CANCEL_ROLES: ReadonlySet<string> = new Set(['owner', 'admin', 'editor']);
const SCHEDULE_ROLES = CANCEL_ROLES;
const EDITABLE_STATES: ReadonlySet<string> = new Set(['draft', 'canceled', 'scheduled']);
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

export function editableBy(
  role: string,
  { destinations }: { readonly destinations: readonly { readonly state: string }[] },
): boolean {
  if (destinations.length === 0) return false;
  if (!destinations.every((d) => EDITABLE_STATES.has(d.state))) return false;
  const scheduled = destinations.some((d) => d.state === 'scheduled');
  return (scheduled ? SCHEDULE_ROLES : DRAFT_ROLES).has(role);
}
