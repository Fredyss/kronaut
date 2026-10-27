import { Temporal } from 'temporal-polyfill';
import type { PostSummary } from '../api.ts';
import { m } from '../i18n.ts';

type Summary = PostSummary;
type SummaryDestination = Summary['destinations'][number];

export interface Entry {
  readonly post: Summary;
  readonly destination: SummaryDestination;
  readonly at: string;
  readonly day: string;
  readonly hour: number;
}

export function slotKey(day: string, hour: number): string {
  return `${day}T${String(hour).padStart(2, '0')}`;
}

export function byDay(items: readonly Summary[], timeZone: string): Map<string, Entry[]> {
  const days = new Map<string, Entry[]>();
  for (const post of items) {
    for (const destination of post.destinations) {
      const at = destination.scheduledAt;
      if (at === null) continue;
      const local = Temporal.Instant.from(at).toZonedDateTimeISO(timeZone);
      const key = local.toPlainDate().toString();
      const list = days.get(key) ?? [];
      list.push({ post, destination, at, day: key, hour: local.hour });
      days.set(key, list);
    }
  }
  for (const list of days.values()) {
    list.sort(
      (a, b) =>
        Date.parse(a.at) - Date.parse(b.at) ||
        (a.destination.id < b.destination.id ? -1 : a.destination.id > b.destination.id ? 1 : 0),
    );
  }
  return days;
}

export function byHour(days: ReadonlyMap<string, readonly Entry[]>): Map<string, Entry[]> {
  const slots = new Map<string, Entry[]>();
  for (const list of days.values()) {
    for (const entry of list) {
      const key = slotKey(entry.day, entry.hour);
      const slot = slots.get(key) ?? [];
      slot.push(entry);
      slots.set(key, slot);
    }
  }
  return slots;
}

export function postText(post: Summary): string {
  if (post.excerpt !== '') return post.excerpt;
  return post.title ?? m.calendar_untitled();
}
