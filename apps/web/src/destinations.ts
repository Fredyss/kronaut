import type { Destination } from './api.ts';
import { m } from './i18n.ts';

const POLL_MS = 5000;
const DUE_SOON_MS = 10 * 60 * 1000;
const MAX_WAIT_MS = 60 * 60 * 1000;
export const NEEDS_ACTION_POLL_MS = 30_000;
export const BUSY: ReadonlySet<string> = new Set(['publishing', 'verifying', 'retry_wait']);

export interface Pollable {
  readonly publishSummary: string;
  readonly destinations: readonly { readonly state: string; readonly scheduledAt: string | null }[];
}

export function pollDelay(post: Pollable | undefined, now: number): number | false {
  if (post === undefined) return false;
  if (post.publishSummary !== 'scheduled' && post.publishSummary !== 'in_progress') return false;
  let delay = Number.POSITIVE_INFINITY;
  for (const d of post.destinations) {
    if (BUSY.has(d.state)) return POLL_MS;
    if (d.state !== 'scheduled' || d.scheduledAt === null) continue;
    delay = Math.min(delay, Date.parse(d.scheduledAt) - DUE_SOON_MS - now);
  }
  if (delay === Number.POSITIVE_INFINITY) return false;
  return Math.min(Math.max(delay, POLL_MS), MAX_WAIT_MS);
}

export function stateLabel(state: Destination['state']): string {
  switch (state) {
    case 'draft':
      return m.destination_state_draft();
    case 'scheduled':
      return m.destination_state_scheduled();
    case 'publishing':
      return m.destination_state_publishing();
    case 'retry_wait':
      return m.destination_state_retry_wait();
    case 'verifying':
      return m.destination_state_verifying();
    case 'published':
      return m.destination_state_published();
    case 'unconfirmed':
      return m.destination_state_unconfirmed();
    case 'failed':
      return m.destination_state_failed();
    case 'blocked':
      return m.destination_state_blocked();
    case 'awaiting_manual':
      return m.destination_state_awaiting_manual();
    case 'canceled':
      return m.destination_state_canceled();
  }
}

export function httpsUrl(value: string | null): string | null {
  if (value === null || !URL.canParse(value)) return null;
  return new URL(value).protocol === 'https:' ? value : null;
}
