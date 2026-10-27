import { Temporal } from 'temporal-polyfill';

export const KEEP_DAILY = 7;
export const KEEP_WEEKLY = 4;

const ARCHIVE = /^kronaut-(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z\.age$/;
const PARTIAL_SUFFIX = '.partial';
const MAX_AGE = { hours: 24 } as const;

interface Archive {
  readonly name: string;
  readonly at: Temporal.Instant;
}

export interface RotationPlan {
  readonly keep: readonly string[];
  readonly remove: readonly string[];
}

function pad(value: number, width = 2): string {
  return String(value).padStart(width, '0');
}

export function archiveName(at: Temporal.Instant): string {
  const t = at.toZonedDateTimeISO('UTC');
  const date = `${pad(t.year, 4)}${pad(t.month)}${pad(t.day)}`;
  return `kronaut-${date}T${pad(t.hour)}${pad(t.minute)}${pad(t.second)}Z.age`;
}

export function parseArchiveName(name: string): Temporal.Instant | null {
  const match = ARCHIVE.exec(name);
  if (match === null) return null;
  const [year, month, day, hour, minute, second] = match.slice(1).map(Number) as [
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  try {
    return Temporal.ZonedDateTime.from(
      { timeZone: 'UTC', year, month, day, hour, minute, second },
      { overflow: 'reject' },
    ).toInstant();
  } catch {
    return null;
  }
}

function archivesNewestFirst(names: readonly string[]): Archive[] {
  return names
    .flatMap((name) => {
      const at = parseArchiveName(name);
      return at === null ? [] : [{ name, at }];
    })
    .sort((a, b) => Temporal.Instant.compare(b.at, a.at));
}

function olderThanMaxAge(at: Temporal.Instant, now: Temporal.Instant): boolean {
  return Temporal.Instant.compare(at.add(MAX_AGE), now) < 0;
}

function isStalePartial(name: string, now: Temporal.Instant): boolean {
  if (!name.endsWith(PARTIAL_SUFFIX)) return false;
  const at = parseArchiveName(name.slice(0, -PARTIAL_SUFFIX.length));
  return at !== null && olderThanMaxAge(at, now);
}

function utcDay(at: Temporal.Instant): string {
  return at.toZonedDateTimeISO('UTC').toPlainDate().toString();
}

function isoWeek(at: Temporal.Instant): string {
  const t = at.toZonedDateTimeISO('UTC');
  return `${t.yearOfWeek}-W${t.weekOfYear}`;
}

function pickDaily(archives: readonly Archive[], kept: Set<string>): void {
  const days = new Set<string>();
  for (const archive of archives) {
    if (days.size === KEEP_DAILY) return;
    const day = utcDay(archive.at);
    if (days.has(day)) continue;
    days.add(day);
    kept.add(archive.name);
  }
}

function pickWeekly(archives: readonly Archive[], kept: Set<string>): void {
  const covered = new Set(
    archives.filter((archive) => kept.has(archive.name)).map((archive) => isoWeek(archive.at)),
  );
  let weekly = 0;
  for (const archive of archives) {
    if (weekly === KEEP_WEEKLY) return;
    const week = isoWeek(archive.at);
    if (kept.has(archive.name) || covered.has(week)) continue;
    covered.add(week);
    kept.add(archive.name);
    weekly++;
  }
}

export function planRotation(names: readonly string[], now: Temporal.Instant): RotationPlan {
  const archives = archivesNewestFirst(names);
  const kept = new Set<string>();
  pickDaily(archives, kept);
  pickWeekly(archives, kept);
  return {
    keep: archives.filter((archive) => kept.has(archive.name)).map((archive) => archive.name),
    remove: [
      ...archives.filter((archive) => !kept.has(archive.name)).map((archive) => archive.name),
      ...names.filter((name) => isStalePartial(name, now)),
    ],
  };
}

export function needsCatchUp(names: readonly string[], now: Temporal.Instant): boolean {
  const newest = archivesNewestFirst(names)[0];
  return newest === undefined || olderThanMaxAge(newest.at, now);
}
