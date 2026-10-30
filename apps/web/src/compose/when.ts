import { useState } from 'react';
import { Temporal } from 'temporal-polyfill';
import { m } from '../i18n.ts';
import { issueMessage } from './issues.ts';
import type { ComposeWhen } from './submit.ts';

export type Mode = ComposeWhen['mode'];

export interface WhenStart {
  readonly mode: Mode;
  readonly at?: string;
  readonly tz?: string;
}

function browserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

type WhenResult = { readonly when: ComposeWhen } | { readonly problem: string };

export function resolveWhen(mode: Mode, date: string, time: string, tz: string): WhenResult {
  if (mode !== 'instant') return { when: { mode } };
  let local: Temporal.PlainDateTime;
  try {
    local = Temporal.PlainDate.from(date).toPlainDateTime(Temporal.PlainTime.from(time));
  } catch {
    return { problem: m.compose_error_when_missing() };
  }
  const at = local.toZonedDateTime(tz).toInstant();
  if (Temporal.Instant.compare(at, Temporal.Now.instant()) <= 0) {
    return { problem: issueMessage('in_past') };
  }
  return { when: { mode: 'instant', scheduleLocal: local.toString(), scheduleTz: tz } };
}

export function submitLabel(mode: Mode, pending: boolean, request = false): string {
  if (request) return pending ? m.compose_requesting_approval() : m.compose_request_approval();
  if (mode === 'draft') return pending ? m.compose_saving_draft() : m.compose_save_draft();
  if (mode === 'asap') return pending ? m.compose_publishing() : m.compose_publish_now();
  if (mode === 'queue') return pending ? m.compose_scheduling() : m.compose_add_to_queue();
  return pending ? m.compose_scheduling() : m.compose_schedule();
}

export function upcoming(at: string | undefined, tz: string): Temporal.PlainDateTime | null {
  if (at === undefined) return null;
  try {
    const local = Temporal.PlainDateTime.from(at);
    const instant = local.toZonedDateTime(tz).toInstant();
    return Temporal.Instant.compare(instant, Temporal.Now.instant()) > 0 ? local : null;
  } catch {
    return null;
  }
}

export function useWhen(at?: string, zone?: string, startMode?: Mode) {
  const [tz] = useState(() => zone ?? browserTimeZone());
  const [start] = useState(() => upcoming(at, tz));
  const [mode, setMode] = useState<Mode>(startMode ?? (start === null ? 'asap' : 'instant'));
  const [date, setDate] = useState(start?.toPlainDate().toString() ?? '');
  const [time, setTime] = useState(start?.toPlainTime().toString({ smallestUnit: 'minute' }) ?? '');
  return { mode, setMode, date, setDate, time, setTime, tz };
}

export type WhenState = ReturnType<typeof useWhen>;
