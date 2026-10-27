import { describe, expect, it } from 'vitest';
import { scriptedHttp } from '../_kit/testing.ts';
import { authServerFor, resolveIdentity } from './identity.ts';
import {
  AS,
  authServer,
  context,
  DID,
  didDocument,
  failureOf,
  fakeDns,
  HANDLE,
  OTHER_DID,
  PDS,
  protectedResource,
} from './testing.ts';

describe('bluesky discovery', () => {
  it('resolves handle → DID → PDS → AS preferring DNS, and rejects path did:web and a foreign issuer', async () => {
    const http = scriptedHttp([
      {
        url: `https://${HANDLE}/.well-known/atproto-did`,
        headers: { 'content-type': 'text/plain' },
        text: OTHER_DID,
      },
      didDocument(),
      protectedResource(),
      authServer(),
    ]);
    const ctx = context(http, fakeDns({ [`_atproto.${HANDLE}`]: ['v=spf1 -all', `did=${DID}`] }));
    expect(await resolveIdentity(ctx, '@Alice.Example.com')).toEqual({
      did: DID,
      handle: HANDLE,
      pds: PDS,
    });
    expect((await authServerFor(ctx, PDS)).issuer).toBe(AS);
    http.assertDone();

    const viaHttps = scriptedHttp([
      {
        url: `https://${HANDLE}/.well-known/atproto-did`,
        headers: { 'content-type': 'text/plain' },
        text: DID,
      },
      didDocument(),
    ]);
    const failingDns = {
      txt: () =>
        Promise.reject(Object.assign(new Error('queryTxt ESERVFAIL'), { code: 'ESERVFAIL' })),
    };
    expect((await resolveIdentity(context(viaHttps, failingDns), HANDLE)).did).toBe(DID);

    const none = scriptedHttp([]);
    expect(await failureOf(resolveIdentity(context(none), 'did:web:example.com:alice'))).toEqual({
      kind: 'permanent',
      code: 'did_unsupported',
    });
    expect(none.calls).toHaveLength(0);

    const foreign = scriptedHttp([protectedResource(), authServer(AS, 'https://evil.example')]);
    expect(await failureOf(authServerFor(context(foreign), PDS))).toEqual({
      kind: 'permanent',
      code: 'as_issuer_mismatch',
    });
  });
});
