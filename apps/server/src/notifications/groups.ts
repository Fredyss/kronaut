export const EMAIL_GROUPS = ['failures', 'approvals', 'channels'] as const;

export type EmailGroup = (typeof EMAIL_GROUPS)[number];

const GROUP_OF: ReadonlyMap<string, EmailGroup> = new Map([
  ['destination.failed', 'failures'],
  ['destination.unconfirmed', 'failures'],
  ['destination.awaiting_manual', 'failures'],
  ['post.approval_requested', 'approvals'],
  ['post.approved', 'approvals'],
  ['post.rejected', 'approvals'],
  ['channel.needs_reauth', 'channels'],
  ['channel.expiring', 'channels'],
]);

export function groupOf(kind: string): EmailGroup | null {
  return GROUP_OF.get(kind) ?? null;
}

export function isMuted(kind: string, muted: readonly string[]): boolean {
  const group = groupOf(kind);
  return group !== null && muted.includes(group);
}
