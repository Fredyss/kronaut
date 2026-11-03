import { Temporal } from 'temporal-polyfill';
import { describe, expect, it } from 'vitest';
import { archiveName, needsCatchUp, parseArchiveName, planRotation } from './rotation.ts';

const NOW = Temporal.Instant.from('2026-10-26T04:00:00Z');

function nightly(days: number, last = '2026-10-26T03:30:00Z'): string[] {
  const end = Temporal.Instant.from(last);
  return Array.from({ length: days }, (_, i) => archiveName(end.subtract({ hours: 24 * i })));
}

describe('archive names', () => {
  it('formats a UTC timestamp and parses it back', () => {
    const at = Temporal.Instant.from('2026-03-05T07:08:09.987Z');
    expect(archiveName(at)).toBe('kronaut-20260305T070809Z.age');
    expect(parseArchiveName('kronaut-20260305T070809Z.age')?.toString()).toBe(
      '2026-03-05T07:08:09Z',
    );
  });

  it('rejects anything that is not an archive name with a real UTC timestamp', () => {
    for (const name of [
      'kronaut-20261301T000000Z.age',
      'kronaut-20260230T000000Z.age',
      'kronaut-20260101T250000Z.age',
      'kronaut-20260101T000000Z.age.partial',
      'kronaut-2026-01-01.age',
      'kronaut-20260101T000000.age',
      'other-20260101T000000Z.age',
      'last-backup.json',
    ]) {
      expect(parseArchiveName(name)).toBeNull();
    }
  });
});

describe('planRotation', () => {
  it('keeps the newest 7 plus one archive from each of the 4 older ISO weeks', () => {
    const names = nightly(60);
    const plan = planRotation(names, NOW);
    expect(plan.keep).toEqual([
      'kronaut-20261026T033000Z.age',
      'kronaut-20261025T033000Z.age',
      'kronaut-20261024T033000Z.age',
      'kronaut-20261023T033000Z.age',
      'kronaut-20261022T033000Z.age',
      'kronaut-20261021T033000Z.age',
      'kronaut-20261020T033000Z.age',
      'kronaut-20261018T033000Z.age',
      'kronaut-20261011T033000Z.age',
      'kronaut-20261004T033000Z.age',
      'kronaut-20260927T033000Z.age',
    ]);
    expect(plan.remove).toHaveLength(49);
    expect([...plan.keep, ...plan.remove].sort()).toEqual([...names].sort());
  });

  it('skips weeks the daily archives already cover and keeps one per older week', () => {
    const names = [
      ...nightly(3),
      'kronaut-20260920T033000Z.age',
      'kronaut-20260919T033000Z.age',
      'kronaut-20260601T033000Z.age',
      'kronaut-20260530T033000Z.age',
      'kronaut-20260101T033000Z.age',
      'kronaut-20251231T033000Z.age',
    ];
    const plan = planRotation(names, NOW);
    expect(plan.remove).toEqual(['kronaut-20251231T033000Z.age']);
  });

  it('keeps one archive per UTC day, so extra runs on one day do not push out older days', () => {
    const names = [
      ...nightly(10),
      'kronaut-20261026T010000Z.age',
      'kronaut-20261026T020000Z.age',
      'kronaut-20261025T120000Z.age',
    ];
    const plan = planRotation(names, NOW);
    expect(plan.keep).toEqual([
      'kronaut-20261026T033000Z.age',
      'kronaut-20261025T120000Z.age',
      'kronaut-20261024T033000Z.age',
      'kronaut-20261023T033000Z.age',
      'kronaut-20261022T033000Z.age',
      'kronaut-20261021T033000Z.age',
      'kronaut-20261020T033000Z.age',
      'kronaut-20261018T033000Z.age',
    ]);
    expect(plan.remove).toEqual([
      'kronaut-20261026T020000Z.age',
      'kronaut-20261026T010000Z.age',
      'kronaut-20261025T033000Z.age',
      'kronaut-20261019T033000Z.age',
      'kronaut-20261017T033000Z.age',
    ]);
  });

  it('deletes nothing when there are fewer than 7 archives', () => {
    expect(planRotation(nightly(6), NOW).remove).toEqual([]);
  });

  it('never touches unknown files and removes only stale .partial files', () => {
    const unknown = [
      'notes.txt',
      'last-backup.json',
      'last-backup.json.tmp',
      'kronaut-latest.age',
      'kronaut-20261301T000000Z.age',
      'kronaut-20261301T000000Z.age.partial',
      '.kronaut-export-abc123',
    ];
    const names = [
      ...nightly(10),
      ...unknown,
      'kronaut-20261025T033000Z.age.partial',
      'kronaut-20261026T033000Z.age.partial',
    ];
    const { keep, remove } = planRotation(names, NOW);
    expect(remove).toEqual([
      'kronaut-20261019T033000Z.age',
      'kronaut-20261017T033000Z.age',
      'kronaut-20261025T033000Z.age.partial',
    ]);
    for (const name of [...unknown, 'kronaut-20261026T033000Z.age.partial']) {
      expect(keep).not.toContain(name);
      expect(remove).not.toContain(name);
    }
  });
});

describe('needsCatchUp', () => {
  it('runs when there is no archive or the newest is older than 24 h', () => {
    expect(needsCatchUp([], NOW)).toBe(true);
    expect(needsCatchUp(['notes.txt', 'kronaut-20261026T033000Z.age.partial'], NOW)).toBe(true);
    expect(needsCatchUp(nightly(5, '2026-10-25T03:59:59Z'), NOW)).toBe(true);
    expect(needsCatchUp(nightly(5, '2026-10-25T04:00:00Z'), NOW)).toBe(false);
    expect(
      needsCatchUp(['kronaut-20261020T000000Z.age', 'kronaut-20261026T010000Z.age'], NOW),
    ).toBe(false);
  });
});
