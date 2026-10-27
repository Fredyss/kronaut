import { decodeJwt } from 'jose';
import { describe, expect, it } from 'vitest';
import { TEST_NOW } from '../_kit/testing.ts';
import { accessTokenHash, dpopProof, generateDpopKey } from './dpop.ts';

describe('bluesky DPoP', () => {
  it('binds PDS proofs to the access token with ath and drops query and fragment from htu', async () => {
    const token = 'Kz~8mXK1EalYznwH-LC-1fBAo.4Ljp~zsPE_NeO.gxU';
    expect(accessTokenHash(token)).toBe('fUHyO2r2Z3DZ53EsNrWBb0xWXoaNy59IiKCAqksmQEo');
    const proof = await dpopProof(
      await generateDpopKey(),
      {
        htm: 'GET',
        url: 'https://pds.example.net/xrpc/com.atproto.repo.getRecord?repo=x#frag',
        nonce: 'n1',
        accessToken: token,
      },
      TEST_NOW,
    );
    expect(decodeJwt(proof)).toMatchObject({
      htm: 'GET',
      htu: 'https://pds.example.net/xrpc/com.atproto.repo.getRecord',
      nonce: 'n1',
      ath: accessTokenHash(token),
    });
  });
});
