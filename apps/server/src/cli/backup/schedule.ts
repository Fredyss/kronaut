import { basename } from 'node:path';
import type { Logger } from 'pino';
import { Temporal } from 'temporal-polyfill';
import { UsageError } from '../errors.ts';
import { needsCatchUp } from './rotation.ts';

export const DEFAULT_TIME = '03:30';
export const DEFAULT_TIMEZONE = 'UTC';
export const MAX_RETRIES = 2;
export const RETRY_DELAY = { hours: 1 } as const;
export const MAX_SLEEP_MS = 5 * 60 * 1000;

const HH_MM = /^([01]\d|2[0-3]):([0-5]\d)$/;
const IANA_TZ = /^[A-Za-z_]+(\/[A-Za-z0-9_+-]+)*$/;

export interface DailyTime {
  readonly time: Temporal.PlainTime;
  readonly timeZone: string;
}

export interface BackupStatus {
  readonly ok: boolean;
  readonly at: string;
  readonly file?: string;
  readonly error?: string;
}

export interface ScheduleDeps {
  readonly daily: DailyTime;
  readonly now: () => Temporal.Instant;
  readonly sleep: (ms: number, signal: AbortSignal) => Promise<void>;
  readonly listNames: () => Promise<readonly string[]>;
  readonly cleanup: () => Promise<void>;
  readonly recipient: () => string | undefined;
  readonly runBackup: (recipient: string) => Promise<string>;
  readonly writeStatus: (status: BackupStatus) => Promise<void>;
  readonly logger: Logger;
}

type Outcome = 'ok' | 'failed' | 'skipped';

function parseTimeZone(value: string): string {
  const fail = new UsageError((m) => m.timezone_invalid({ option: 'KRONAUT_BACKUP_TIMEZONE' }));
  if (!IANA_TZ.test(value)) throw fail;
  try {
    return Temporal.Now.zonedDateTimeISO(value).timeZoneId;
  } catch {
    throw fail;
  }
}

export function parseDailyTime(time: string | undefined, timeZone: string | undefined): DailyTime {
  const match = HH_MM.exec(time ?? DEFAULT_TIME);
  if (match === null) throw new UsageError((m) => m.backup_time_invalid({}));
  return {
    time: new Temporal.PlainTime(Number(match[1]), Number(match[2])),
    timeZone: parseTimeZone(timeZone ?? DEFAULT_TIMEZONE),
  };
}

export function nextRun(now: Temporal.Instant, daily: DailyTime): Temporal.Instant {
  const today = now.toZonedDateTimeISO(daily.timeZone).toPlainDate();
  const at = (date: Temporal.PlainDate) =>
    date
      .toPlainDateTime(daily.time)
      .toZonedDateTime(daily.timeZone, { disambiguation: 'compatible' })
      .toInstant();
  const candidate = at(today);
  return Temporal.Instant.compare(candidate, now) > 0 ? candidate : at(today.add({ days: 1 }));
}

export function describeError(error: unknown): string {
  if (!(error instanceof Error)) return 'unknown error';
  const { code } = error as Error & { code?: unknown };
  return typeof code === 'string' && code !== '' ? code : error.message;
}

async function sleepUntil(
  deps: ScheduleDeps,
  target: Temporal.Instant,
  signal: AbortSignal,
): Promise<void> {
  while (!signal.aborted) {
    const remaining = target.epochMilliseconds - deps.now().epochMilliseconds;
    if (remaining <= 0) return;
    await deps.sleep(Math.min(remaining, MAX_SLEEP_MS), signal);
  }
}

async function backUp(deps: ScheduleDeps): Promise<{ outcome: Outcome; status: BackupStatus }> {
  try {
    const recipient = deps.recipient();
    if (recipient === undefined) {
      const error = 'KRONAUT_BACKUP_RECIPIENT is not set';
      deps.logger.error(
        `${error}; no backup was made. Put the age1… recipient in secrets/backup_recipient and restart the backup service`,
      );
      return { outcome: 'skipped', status: { ok: false, at: deps.now().toString(), error } };
    }
    const file = basename(await deps.runBackup(recipient));
    deps.logger.info({ file }, 'backup complete');
    return { outcome: 'ok', status: { ok: true, at: deps.now().toString(), file } };
  } catch (err) {
    const error = describeError(err);
    deps.logger.error({ error }, 'backup failed');
    return { outcome: 'failed', status: { ok: false, at: deps.now().toString(), error } };
  }
}

async function attempt(deps: ScheduleDeps): Promise<Outcome> {
  const { outcome, status } = await backUp(deps);
  try {
    await deps.writeStatus(status);
  } catch (err) {
    deps.logger.error({ error: describeError(err) }, 'cannot write last-backup.json');
  }
  return outcome;
}

async function attemptWithRetries(deps: ScheduleDeps, signal: AbortSignal): Promise<void> {
  for (let retry = 0; retry <= MAX_RETRIES; retry++) {
    if (retry > 0) {
      deps.logger.info({ retry, of: MAX_RETRIES }, 'retrying the backup in 1 h');
      await sleepUntil(deps, deps.now().add(RETRY_DELAY), signal);
      if (signal.aborted) return;
    }
    if ((await attempt(deps)) !== 'failed') return;
  }
}

export async function runSchedule(deps: ScheduleDeps, signal: AbortSignal): Promise<void> {
  await deps.cleanup();
  const names = await deps.listNames().catch(() => []);
  if (needsCatchUp(names, deps.now())) {
    deps.logger.info('no backup from the last 24 h; running one now');
    await attemptWithRetries(deps, signal);
  }
  while (!signal.aborted) {
    const next = nextRun(deps.now(), deps.daily);
    deps.logger.info({ next: next.toString() }, 'next backup scheduled');
    await sleepUntil(deps, next, signal);
    if (signal.aborted) break;
    await attemptWithRetries(deps, signal);
  }
  deps.logger.info('backup schedule stopped');
}
