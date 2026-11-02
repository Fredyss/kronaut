import { CANCEL_ROLES, DRAFT_ROLES } from './permissions.ts';

const SCHEDULE_ROLES = CANCEL_ROLES;
const EDITABLE_STATES: ReadonlySet<string> = new Set(['draft', 'canceled', 'scheduled']);

interface EditableDestination {
  readonly state: string;
  readonly remoteUrl: string | null;
  readonly publishedAt: string | null;
}

interface Editable {
  readonly destinations: readonly EditableDestination[];
}

export function canceledLive({ destinations }: Editable): boolean {
  return destinations.some(
    (d) => d.state === 'canceled' && (d.remoteUrl !== null || d.publishedAt !== null),
  );
}

export function editableBy(role: string, post: Editable): boolean {
  const { destinations } = post;
  if (destinations.length === 0 || canceledLive(post)) return false;
  if (!destinations.every((d) => EDITABLE_STATES.has(d.state))) return false;
  const scheduled = destinations.some((d) => d.state === 'scheduled');
  return (scheduled ? SCHEDULE_ROLES : DRAFT_ROLES).has(role);
}
