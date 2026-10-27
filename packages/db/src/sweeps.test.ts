import type { Kysely } from 'kysely';
import { describe, expect, it } from 'vitest';
import type { DB } from './schema.gen.ts';
import { createSweeps } from './sweeps.ts';

const sweeps = createSweeps({} as Kysely<DB>);

const listings = [
  ['dueDestinations', (limit: number) => sweeps.dueDestinations(limit)],
  ['expiredLeases', (limit: number) => sweeps.expiredLeases(limit)],
  ['verifyingDestinations', (limit: number) => sweeps.verifyingDestinations(limit)],
  ['quarantineDestinations', (limit: number) => sweeps.quarantineDestinations(limit)],
  ['expiringCredentials', (limit: number) => sweeps.expiringCredentials(60, limit)],
  ['mediaGc', (limit: number) => sweeps.mediaGc(limit)],
  ['workspaces', (limit: number) => sweeps.workspaces(null, limit)],
] as const;

describe('sweep limits', () => {
  for (const [name, call] of listings) {
    it(`${name} rejects limits outside 1..1000`, async () => {
      for (const limit of [0, -1, 1001, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
        await expect(call(limit)).rejects.toThrow(RangeError);
      }
    });
  }

  it('expiringCredentials rejects a negative or non-finite window', async () => {
    for (const within of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      await expect(sweeps.expiringCredentials(within)).rejects.toThrow(RangeError);
    }
  });
});
