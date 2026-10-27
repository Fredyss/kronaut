import { type Client, postsReschedule } from '@kronaut/sdk';
import { toast } from '@kronaut/ui';
import { type QueryClient, useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState } from 'react';
import { Temporal } from 'temporal-polyfill';
import {
  detailCodes,
  errorCode,
  errorStatus,
  type Post,
  type PostList,
  type PostSummary,
  postsKey,
} from '../api.ts';
import { useApiClient } from '../context.ts';
import { BUSY } from '../destinations.ts';
import { m } from '../i18n.ts';
import { currentInstant, today } from './time.ts';

const ATTEMPTS = 2;

export interface MovablePost extends PostSummary {
  readonly scheduleMode: 'instant';
  readonly scheduleLocal: string;
  readonly scheduleTz: string;
}

export interface Target {
  readonly scheduleLocal: string;
  readonly scheduleTz: string;
}

export interface Moved {
  readonly id: number;
  readonly post: PostSummary;
  readonly back: Target;
  readonly at: string;
}

export function isMovable(post: PostSummary): post is MovablePost {
  return (
    post.scheduleMode === 'instant' &&
    post.scheduleLocal !== null &&
    post.scheduleTz !== null &&
    post.destinations.some((d) => d.state === 'scheduled') &&
    !post.destinations.some((d) => BUSY.has(d.state))
  );
}

export function dayDelta(from: string, to: string): number {
  return Temporal.PlainDate.from(from).until(Temporal.PlainDate.from(to)).days;
}

export function movedLocal(post: MovablePost, days: number): string {
  return Temporal.PlainDateTime.from(post.scheduleLocal).add({ days }).toString();
}

export function canLand(post: MovablePost, days: number): boolean {
  if (days === 0) return false;
  const date = Temporal.PlainDateTime.from(movedLocal(post, days)).toPlainDate();
  return Temporal.PlainDate.compare(date, today(post.scheduleTz)) >= 0;
}

export function slotLocal(
  post: MovablePost,
  at: string,
  slot: string,
  timeZone: string,
): string | null {
  const shown = Temporal.Instant.from(at).toZonedDateTimeISO(timeZone).toPlainTime();
  const zoned = Temporal.PlainDate.from(slot.slice(0, 10))
    .toPlainDateTime(shown.with({ hour: Number(slot.slice(11)) }))
    .toZonedDateTime(timeZone);
  const local = zoned.withTimeZone(post.scheduleTz).toPlainDateTime();
  if (
    Temporal.PlainDateTime.compare(local, Temporal.PlainDateTime.from(post.scheduleLocal)) === 0
  ) {
    return null;
  }
  const upcoming = Temporal.Instant.compare(zoned.toInstant(), currentInstant()) > 0;
  return upcoming ? local.toString() : null;
}

export function instantOf(target: Target): string {
  return Temporal.PlainDateTime.from(target.scheduleLocal)
    .toZonedDateTime(target.scheduleTz)
    .toInstant()
    .toString();
}

function shifted(post: PostSummary, target: Target): PostSummary {
  const at = new Date(instantOf(target)).toISOString();
  return {
    ...post,
    scheduleLocal: target.scheduleLocal,
    scheduleTz: target.scheduleTz,
    destinations: post.destinations.map((d) =>
      d.state === 'scheduled' ? { ...d, scheduledAt: at } : d,
    ),
  };
}

function merged(post: PostSummary, server: Post): PostSummary {
  const byId = new Map(server.destinations.map((d) => [d.id, d]));
  return {
    ...post,
    version: server.version,
    title: server.title,
    publishSummary: server.publishSummary,
    scheduleMode: server.scheduleMode,
    scheduleLocal: server.scheduleLocal,
    scheduleTz: server.scheduleTz,
    updatedAt: server.updatedAt,
    destinations: post.destinations.map((d) => {
      const next = byId.get(d.id);
      return next === undefined
        ? d
        : {
            ...d,
            state: next.state,
            scheduledAt: next.scheduledAt,
            publishedAt: next.publishedAt,
            remoteUrl: next.remoteUrl,
            lastErrorCode: next.lastErrorCode,
          };
    }),
  };
}

function rangeKey(workspaceId: string) {
  return [...postsKey(workspaceId), 'range'] as const;
}

function replace(
  queryClient: QueryClient,
  workspaceId: string,
  postId: string,
  update: (post: PostSummary) => PostSummary,
): void {
  queryClient.setQueriesData<PostList>({ queryKey: rangeKey(workspaceId) }, (list) =>
    list === undefined
      ? list
      : { ...list, items: list.items.map((item) => (item.id === postId ? update(item) : item)) },
  );
}

function isAmbiguous(error: unknown): boolean {
  const status = errorStatus(error);
  return status === null || status === 0 || status >= 500;
}

async function reschedule(
  client: Client,
  workspaceId: string,
  post: PostSummary,
  target: Target,
): Promise<Post> {
  const key = crypto.randomUUID();
  for (let attempt = 1; ; attempt++) {
    try {
      const { data } = await postsReschedule({
        client,
        path: { workspaceId, postId: post.id },
        body: { expectedVersion: post.version, ...target },
        headers: { 'Idempotency-Key': key },
      });
      return data;
    } catch (error) {
      if (attempt >= ATTEMPTS || !isAmbiguous(error)) throw error;
    }
  }
}

export function moveError(error: unknown): string {
  const code = errorCode(error);
  if (code === 'unprocessable' && detailCodes(error).includes('in_past')) {
    return m.calendar_move_in_past();
  }
  if (code === 'unprocessable' && detailCodes(error).includes('outside_approved_schedule')) {
    return m.calendar_move_reapproval();
  }
  switch (code) {
    case 'version_conflict':
      return m.calendar_move_changed();
    case 'approval_required':
      return m.calendar_move_approval();
    case 'conflict':
      return m.calendar_move_unavailable();
    default:
      return m.calendar_move_failed();
  }
}

export interface MoveOptions {
  readonly back: Target | null;
  onSettled?(moved: PostSummary | null): void;
}

export function useMove(workspaceId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());
  const [moved, setMoved] = useState<Moved | null>(null);
  const sequence = useRef(0);

  const send = useCallback(
    async (post: PostSummary, target: Target, options: MoveOptions) => {
      setMoved(null);
      setPending((current) => new Set(current).add(post.id));
      await queryClient.cancelQueries({ queryKey: rangeKey(workspaceId) });
      const snapshot = queryClient.getQueriesData<PostList>({ queryKey: rangeKey(workspaceId) });
      replace(queryClient, workspaceId, post.id, (item) => shifted(item, target));
      let result: PostSummary | null = null;
      try {
        const server = await reschedule(client, workspaceId, post, target);
        result = merged(shifted(post, target), server);
        replace(queryClient, workspaceId, post.id, (item) => merged(item, server));
        if (options.back !== null) {
          sequence.current += 1;
          setMoved({
            id: sequence.current,
            post: result,
            back: options.back,
            at: instantOf(target),
          });
        }
      } catch (error) {
        for (const [key, data] of snapshot) queryClient.setQueryData(key, data);
        toast(moveError(error), 'destructive');
      } finally {
        setPending((current) => {
          const next = new Set(current);
          next.delete(post.id);
          return next;
        });
        void queryClient.invalidateQueries({ queryKey: postsKey(workspaceId) });
        options.onSettled?.(result);
      }
    },
    [client, queryClient, workspaceId],
  );

  const undo = useCallback(
    (notice: Moved) => send(notice.post, notice.back, { back: null }),
    [send],
  );

  const dismiss = useCallback(() => setMoved(null), []);

  return { pending, moved, send, undo, dismiss };
}
