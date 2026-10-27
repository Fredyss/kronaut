import { pino } from 'pino';
import { Temporal } from 'temporal-polyfill';
import { describe, expect, it } from 'vitest';
import { CommandError, UsageError } from '../errors.ts';
import {
  type BackupStatus,
  type DailyTime,
  nextRun,
  parseDailyTime,
  runSchedule,
  type ScheduleDeps,
} from './schedule.ts';

const RECIPIENT = `age1${'q'.repeat(58)}`;

function at(value: string): Temporal.Instant {
  return Temporal.Instant.from(value);
}

describe('parseDailyTime', () => {
  it('defaults to 03:30 UTC', () => {
    const daily = parseDailyTime(undefined, undefined);
    expect(daily.time.toString()).toBe('03:30:00');
    expect(daily.timeZone).toBe('UTC');
  });

  it('rejects an invalid time or time zone as a usage error', () => {
    for (const time of ['3:30', '24:00', '03:60', '03:30:00', 'noon']) {
      expect(() => parseDailyTime(time, 'UTC')).toThrow(UsageError);
    }
    for (const zone of ['Mars/Olympus', '+01:00', '../etc', '']) {
      expect(() => parseDailyTime('03:30', zone)).toThrow(UsageError);
    }
  });
});

describe('nextRun', () => {
  const utc = parseDailyTime('03:30', 'UTC');
  const bratislava = parseDailyTime('02:30', 'Europe/Bratislava');

  it('picks today when the time is still ahead', () => {
    expect(nextRun(at('2026-10-26T01:00:00Z'), utc).toString()).toBe('2026-10-26T03:30:00Z');
  });

  it('picks tomorrow once today’s time has passed or is now', () => {
    expect(nextRun(at('2026-10-26T04:00:00Z'), utc).toString()).toBe('2026-10-27T03:30:00Z');
    expect(nextRun(at('2026-10-26T03:30:00Z'), utc).toString()).toBe('2026-10-27T03:30:00Z');
  });

  it('computes from local wall time in the configured zone', () => {
    expect(nextRun(at('2026-07-01T12:00:00Z'), bratislava).toString()).toBe('2026-07-02T00:30:00Z');
  });

  it('moves a time in the spring DST gap forward', () => {
    expect(nextRun(at('2026-03-28T12:00:00Z'), bratislava).toString()).toBe('2026-03-29T01:30:00Z');
  });

  it('runs once in the autumn DST overlap, at the earlier 02:30', () => {
    const first = nextRun(at('2026-10-24T12:00:00Z'), bratislava);
    expect(first.toString()).toBe('2026-10-25T00:30:00Z');
    expect(nextRun(first.add({ minutes: 5 }), bratislava).toString()).toBe('2026-10-26T01:30:00Z');
  });
});

interface Harness {
  readonly deps: ScheduleDeps;
  readonly controller: AbortController;
  readonly runs: string[];
  readonly statuses: BackupStatus[];
  readonly logs: { level: number; msg: string; error?: string }[];
  readonly cleanups: string[];
}

function harness(options: {
  start: string;
  names?: readonly string[];
  recipient?: string;
  fail?: boolean;
  until: string;
}): Harness {
  const controller = new AbortController();
  const runs: string[] = [];
  const cleanups: string[] = [];
  const statuses: BackupStatus[] = [];
  const logs: Harness['logs'] = [];
  const until = at(options.until);
  let now = at(options.start);
  const daily: DailyTime = parseDailyTime('03:30', 'UTC');
  const deps: ScheduleDeps = {
    daily,
    now: () => now,
    sleep: async (ms) => {
      now = now.add({ milliseconds: ms });
      if (Temporal.Instant.compare(now, until) >= 0) controller.abort();
    },
    listNames: async () => options.names ?? [],
    cleanup: async () => {
      cleanups.push(now.toString());
    },
    recipient: () => options.recipient,
    runBackup: async (recipient) => {
      expect(recipient).toBe(RECIPIENT);
      runs.push(now.toString());
      if (options.fail === true) throw new CommandError('pg_dump failed: connection refused');
      return `/backup/kronaut-${runs.length}.age`;
    },
    writeStatus: async (status) => {
      statuses.push(status);
    },
    logger: pino({ base: null }, { write: (line: string) => logs.push(JSON.parse(line)) }),
  };
  return { deps, controller, runs, statuses, logs, cleanups };
}

describe('runSchedule', () => {
  it('runs at the scheduled time and writes the status file', async () => {
    const h = harness({
      start: '2026-10-26T01:00:00Z',
      names: ['kronaut-20261025T033000Z.age'],
      recipient: RECIPIENT,
      until: '2026-10-26T12:00:00Z',
    });
    await runSchedule(h.deps, h.controller.signal);
    expect(h.runs).toEqual(['2026-10-26T03:30:00Z']);
    expect(h.statuses).toEqual([{ ok: true, at: '2026-10-26T03:30:00Z', file: 'kronaut-1.age' }]);
    expect(h.cleanups).toEqual(['2026-10-26T01:00:00Z']);
  });

  it('catches up at startup when the newest archive is older than 24 h', async () => {
    const h = harness({
      start: '2026-10-26T01:00:00Z',
      names: ['kronaut-20261024T033000Z.age', 'notes.txt'],
      recipient: RECIPIENT,
      until: '2026-10-26T12:00:00Z',
    });
    await runSchedule(h.deps, h.controller.signal);
    expect(h.runs).toEqual(['2026-10-26T01:00:00Z', '2026-10-26T03:30:00Z']);
  });

  it('retries a failed run twice an hour apart, then waits for the next scheduled time', async () => {
    const h = harness({
      start: '2026-10-26T01:00:00Z',
      names: ['kronaut-20261025T033000Z.age'],
      recipient: RECIPIENT,
      fail: true,
      until: '2026-10-27T04:00:00Z',
    });
    await runSchedule(h.deps, h.controller.signal);
    expect(h.runs).toEqual([
      '2026-10-26T03:30:00Z',
      '2026-10-26T04:30:00Z',
      '2026-10-26T05:30:00Z',
      '2026-10-27T03:30:00Z',
    ]);
    expect(h.statuses[0]).toEqual({
      ok: false,
      at: '2026-10-26T03:30:00Z',
      error: 'pg_dump failed: connection refused',
    });
    const errors = h.logs.filter((line) => line.level === 50);
    expect(errors.map((line) => line.error)).toEqual(
      Array(4).fill('pg_dump failed: connection refused'),
    );
    expect(JSON.stringify(h.logs)).not.toContain(RECIPIENT);
  });

  it('logs one error per scheduled time and keeps waiting while the recipient is unset', async () => {
    const h = harness({
      start: '2026-10-26T01:00:00Z',
      names: ['kronaut-20261025T033000Z.age'],
      until: '2026-10-28T12:00:00Z',
    });
    await runSchedule(h.deps, h.controller.signal);
    expect(h.runs).toEqual([]);
    const errors = h.logs.filter((line) => line.level === 50);
    expect(errors).toHaveLength(3);
    expect(errors[0]?.msg).toContain('KRONAUT_BACKUP_RECIPIENT is not set');
    expect(h.statuses.map((status) => status.at)).toEqual([
      '2026-10-26T03:30:00Z',
      '2026-10-27T03:30:00Z',
      '2026-10-28T03:30:00Z',
    ]);
    expect(h.statuses.every((status) => !status.ok)).toBe(true);
  });

  it('stops promptly when the signal is aborted', async () => {
    const h = harness({
      start: '2026-10-26T01:00:00Z',
      names: ['kronaut-20261025T033000Z.age'],
      recipient: RECIPIENT,
      until: '2026-10-26T02:00:00Z',
    });
    await runSchedule(h.deps, h.controller.signal);
    expect(h.runs).toEqual([]);
    expect(h.logs.at(-1)?.msg).toBe('backup schedule stopped');
  });
});
