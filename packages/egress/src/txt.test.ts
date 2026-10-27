import { describe, expect, it } from 'vitest';
import { EgressError } from './errors.ts';
import { resolveTxt, type TxtResolver } from './txt.ts';

function failingWith(code: string): TxtResolver {
  return {
    resolveTxt: () => Promise.reject(Object.assign(new Error(code), { code })),
    cancel: () => {},
  };
}

describe('resolveTxt', () => {
  it('cancels a query that outlives the timeout and reports it as an EgressError', async () => {
    let cancelled = false;
    const hanging: TxtResolver = {
      resolveTxt: () => new Promise(() => {}),
      cancel: () => {
        cancelled = true;
      },
    };
    const outcome = resolveTxt('_atproto.alice.example', { timeoutMs: 10, resolver: hanging });
    await expect(outcome).rejects.toBeInstanceOf(EgressError);
    await expect(outcome).rejects.toMatchObject({ code: 'timeout' });
    expect(cancelled).toBe(true);
  });

  it('joins chunks, treats a missing name as no records and maps other failures', async () => {
    const chunked: TxtResolver = {
      resolveTxt: async () => [['did=did:plc:', 'abc'], ['v=spf1']],
      cancel: () => {},
    };
    await expect(resolveTxt('a.example', { timeoutMs: 1000, resolver: chunked })).resolves.toEqual([
      'did=did:plc:abc',
      'v=spf1',
    ]);
    for (const code of ['ENOTFOUND', 'ENODATA'])
      await expect(
        resolveTxt('a.example', { timeoutMs: 1000, resolver: failingWith(code) }),
      ).resolves.toEqual([]);
    await expect(
      resolveTxt('a.example', { timeoutMs: 1000, resolver: failingWith('ETIMEOUT') }),
    ).rejects.toMatchObject({ name: 'EgressError', code: 'timeout' });
    await expect(
      resolveTxt('a.example', { timeoutMs: 1000, resolver: failingWith('ESERVFAIL') }),
    ).rejects.toMatchObject({ name: 'EgressError', code: 'dns_failure' });
  });
});
