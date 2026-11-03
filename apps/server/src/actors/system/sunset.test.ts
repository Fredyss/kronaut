import { Temporal } from 'temporal-polyfill';
import { describe, expect, it } from 'vitest';
import { apiVersionSunsets } from './sunset.ts';

const TODAY = Temporal.PlainDate.from('2026-10-28');

function manifest(id: string, daysLeft?: number) {
  const sunsetOn = daysLeft === undefined ? undefined : TODAY.add({ days: daysLeft }).toString();
  return { id, apiVersion: { version: 'v1', ...(sunsetOn === undefined ? {} : { sunsetOn }) } };
}

describe('apiVersionSunsets', () => {
  it('warns at 90 days and is critical at 30 days or after the sunset', () => {
    const levels = apiVersionSunsets(
      [91, 90, 31, 30, -1].map((days) => manifest(`p${days}`, days)),
      TODAY,
    ).map(({ daysLeft, level }) => [daysLeft, level]);
    expect(levels).toEqual([
      [91, 'ok'],
      [90, 'warn'],
      [31, 'warn'],
      [30, 'critical'],
      [-1, 'critical'],
    ]);
  });

  it('reports a version without a sunset as ok', () => {
    expect(apiVersionSunsets([manifest('bluesky')], TODAY)).toEqual([
      { provider: 'bluesky', version: 'v1', sunsetOn: null, daysLeft: null, level: 'ok' },
    ]);
  });
});
