import { postsGet, postsReschedule, postsUnschedule } from '@kronaut/sdk';
import { Temporal } from 'temporal-polyfill';
import type { Post } from '../api.ts';
import { idempotency, keyFor } from '../idempotency.ts';
import type { ComposeInput, ComposeWhen, ScheduleWhen, Submitter } from './submit.ts';
import { refusedForApproval, SubmitError, type SubmitTarget } from './submit-error.ts';

type Targets = readonly SubmitTarget[];

export function isScheduled(post: Post): boolean {
  return post.destinations.some((destination) => destination.state === 'scheduled');
}

export async function unschedule(s: Submitter, post: Post, accounts: Targets): Promise<Post> {
  const body = { expectedVersion: post.version };
  s.unschedule = keyFor(s.unschedule, JSON.stringify({ postId: post.id, body }));
  try {
    const { data } = await postsUnschedule({
      client: s.client,
      path: { workspaceId: s.workspaceId, postId: post.id },
      body,
      headers: idempotency(s.unschedule),
    });
    s.unschedule = null;
    s.unscheduled = true;
    return data;
  } catch (error) {
    throw new SubmitError('unschedule', error, accounts);
  }
}

export async function refresh(s: Submitter, post: Post): Promise<Post> {
  const { data } = await postsGet({
    client: s.client,
    path: { workspaceId: s.workspaceId, postId: post.id },
  });
  s.stale = false;
  return data;
}

function toMinute(local: string): string {
  return Temporal.PlainDateTime.from(local).toString({ smallestUnit: 'minute' });
}

function sameWhen(post: Post, when: ScheduleWhen): boolean {
  if (when.mode === 'asap') return post.scheduleMode === 'asap';
  if (when.mode === 'queue') return post.scheduleMode === 'local_per_destination';
  if (post.scheduleMode !== 'instant' || post.scheduleLocal === null) return false;
  const sameTime = toMinute(post.scheduleLocal) === toMinute(when.scheduleLocal);
  return sameTime && post.scheduleTz === when.scheduleTz;
}

// A schedule that timed out may have committed, so the opened copy can't say the post isn't scheduled.
export async function settlePending(
  s: Submitter,
  when: ComposeWhen,
  accounts: Targets,
): Promise<void> {
  const current = s.draft;
  if (!s.opened || current === null || s.schedule === null) return;
  if (when.mode !== 'draft' && !sameWhen(current.post, when)) return;
  try {
    current.post = await refresh(s, current.post);
    s.schedule = null;
  } catch (error) {
    throw new SubmitError('unschedule', error, accounts);
  }
}

async function reschedule(
  s: Submitter,
  post: Post,
  { scheduleLocal, scheduleTz }: Extract<ScheduleWhen, { mode: 'instant' }>,
  accounts: Targets,
): Promise<Post> {
  const body = { expectedVersion: post.version, scheduleLocal, scheduleTz };
  s.schedule = keyFor(s.schedule, JSON.stringify({ postId: post.id, reschedule: body }));
  try {
    const { data } = await postsReschedule({
      client: s.client,
      path: { workspaceId: s.workspaceId, postId: post.id },
      body,
      headers: idempotency(s.schedule),
    });
    s.schedule = null;
    return data;
  } catch (error) {
    if (refusedForApproval(error)) s.refusedMove = scheduleLocal;
    throw new SubmitError('schedule', error, accounts);
  }
}

export async function moveOpened(
  s: Submitter,
  { when, request }: ComposeInput,
  fingerprint: string,
  accounts: Targets,
): Promise<Post | null> {
  const current = s.draft;
  if (!s.opened || current === null || when.mode === 'draft') return null;
  if (current.fingerprint !== fingerprint || !isScheduled(current.post)) return null;
  if (sameWhen(current.post, when)) return current.post;
  if (when.mode !== 'instant') return null;
  if (request !== null && s.refusedMove === when.scheduleLocal) return null;
  current.post = await reschedule(s, current.post, when, accounts);
  return current.post;
}
