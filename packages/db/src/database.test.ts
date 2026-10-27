import { afterAll, describe, expect, it } from 'vitest';
import { createDatabase } from './database.ts';

const WORKSPACE = '00000000-0000-7000-8000-0000000000b1';

const database = createDatabase({ connectionString: 'postgres://nobody@127.0.0.1:1/none' });

afterAll(async () => {
  await database.destroy();
});

describe('createDatabase argument checks', () => {
  it('rejects a non-uuid workspace id before opening a transaction', async () => {
    let called = false;
    await expect(
      database.withTenant('not-a-uuid', { kind: 'system' }, async () => {
        called = true;
      }),
    ).rejects.toThrow(TypeError);
    expect(called).toBe(false);
  });

  it('rejects a malformed actor before opening a transaction', async () => {
    let called = false;
    const run = async () => {
      called = true;
    };
    await expect(database.withTenant(WORKSPACE, { kind: 'user', id: 'nope' }, run)).rejects.toThrow(
      TypeError,
    );
    await expect(database.withActor({ kind: 'grant', id: 'nope' }, run)).rejects.toThrow(TypeError);
    expect(called).toBe(false);
  });
});
