import { EgressError } from '@kronaut/egress';
import { beforeEach, describe, expect, it } from 'vitest';
import { ShortenerFailed } from './failure.ts';
import { createShortener, DUB_BASE_URL, type ShortenerConfig } from './shortener.ts';
import { dubLink, kuttLink, type ShortenerReply, shortenerServer } from './testing.ts';

const KEY = 'dub_CANARY_key_7f3a';
const TARGET =
  'https://blog.example.test/a?utm_source=mastodon&utm_medium=social&utm_campaign=kronaut';
const http = shortenerServer();

const dub: ShortenerConfig = { provider: 'dub', baseUrl: DUB_BASE_URL, domain: null, key: KEY };
const kutt: ShortenerConfig = {
  provider: 'kutt',
  baseUrl: 'https://kutt.to',
  domain: 'go.example.test',
  key: KEY,
};

async function failureOf(promise: Promise<unknown>): Promise<ShortenerFailed> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(ShortenerFailed);
    return error as ShortenerFailed;
  }
  throw new Error('expected a failure');
}

beforeEach(() => http.reset());

describe('dub', () => {
  it('creates a link with the bearer key, the external id and no domain by default', async () => {
    http.reply({ body: dubLink('lnk_1', TARGET) });
    const link = await createShortener({ http, config: dub }).create(TARGET, 'kronaut_x');
    expect(link).toEqual({ shortUrl: 'https://dub.sh/lnk_1', linkId: 'lnk_1' });
    expect(http.calls).toEqual([
      expect.objectContaining({
        url: 'https://api.dub.co/links',
        method: 'POST',
        body: { url: TARGET, externalId: 'kronaut_x' },
        sensitive: ['authorization'],
      }),
    ]);
    expect(http.calls[0]?.headers.authorization).toBe(`Bearer ${KEY}`);
  });

  it('reads a 409 back by its external id and accepts it only for the same target', async () => {
    http.reply({ status: 409, body: { error: { code: 'conflict' } } });
    http.reply({ body: dubLink('lnk_2', TARGET) });
    const shortener = createShortener({ http, config: { ...dub, domain: 'go.example.test' } });
    expect(await shortener.create(TARGET, 'kronaut_y')).toEqual({
      shortUrl: 'https://dub.sh/lnk_2',
      linkId: 'lnk_2',
    });
    expect(http.calls[0]?.body).toMatchObject({ domain: 'go.example.test' });
    expect(http.calls[1]).toMatchObject({
      method: 'GET',
      url: 'https://api.dub.co/links/info?externalId=ext_kronaut_y',
    });

    http.reply({ status: 409 }, { body: dubLink('lnk_3', 'https://elsewhere.example.test/') });
    expect((await failureOf(shortener.create(TARGET, 'kronaut_y'))).kind).toBe('conflict');
  });

  it('checks the key with one read-only list call', async () => {
    http.reply({ body: [] });
    await createShortener({ http, config: dub }).checkKey();
    expect(http.calls[0]).toMatchObject({
      method: 'GET',
      url: 'https://api.dub.co/links?pageSize=1',
    });

    http.reply({ status: 401, body: { error: { code: 'unauthorized' } } });
    const failure = await failureOf(createShortener({ http, config: dub }).checkKey());
    expect(failure).toMatchObject({ kind: 'unauthorized', retryable: false });
  });
});

describe('kutt', () => {
  it('creates a link under /api/v2 with the X-API-KEY header and the domain', async () => {
    http.reply({ body: kuttLink('9f1c', TARGET) });
    const link = await createShortener({ http, config: kutt }).create(TARGET, 'ignored');
    expect(link).toEqual({ shortUrl: 'https://kutt.to/9f1c', linkId: '9f1c' });
    expect(http.calls[0]).toMatchObject({
      url: 'https://kutt.to/api/v2/links',
      method: 'POST',
      body: { target: TARGET, domain: 'go.example.test' },
      sensitive: ['x-api-key'],
    });
    expect(http.calls[0]?.headers['x-api-key']).toBe(KEY);
  });

  it('checks the key against the user endpoint', async () => {
    http.reply({ body: { apikey: KEY } });
    await createShortener({ http, config: kutt }).checkKey();
    expect(http.calls[0]).toMatchObject({ method: 'GET', url: 'https://kutt.to/api/v2/users' });
  });
});

describe('failure kinds', () => {
  const cases: [string, ShortenerReply, string, boolean][] = [
    ['rate limit', { status: 429 }, 'rate_limited', true],
    ['server error', { status: 503 }, 'unavailable', true],
    ['refused link', { status: 422 }, 'refused', false],
    ['bad request', { status: 400 }, 'refused', false],
    ['forbidden', { status: 403 }, 'unauthorized', false],
    ['unexpected body', { body: { nope: true } }, 'invalid_response', false],
    [
      'not a short url',
      { body: { id: 'x', link: 'javascript:alert(1)' } },
      'invalid_response',
      false,
    ],
    ['network', { error: new EgressError('network', `connect to ${KEY}`) }, 'unavailable', true],
    ['timeout', { error: new EgressError('timeout') }, 'timed_out', true],
    [
      'private address',
      { error: new EgressError('blocked_address', 'https://10.0.0.1/api/v2/links') },
      'url_blocked',
      false,
    ],
  ];

  it.each(cases)('classifies a %s by kind only', async (_, reply, kind, retryable) => {
    http.reply(reply);
    const failure = await failureOf(createShortener({ http, config: kutt }).create(TARGET));
    expect(failure).toMatchObject({ kind, retryable });
    expect(failure.message).toBe(kind);
    expect(JSON.stringify(failure, Object.getOwnPropertyNames(failure))).not.toContain(KEY);
    expect(failure.stack ?? '').not.toContain('10.0.0.1');
  });

  it('reports a request cut by the caller as a timeout', async () => {
    http.reply({ hang: true });
    const signal = AbortSignal.timeout(10);
    const shortener = createShortener({ http, config: kutt, signal });
    expect(await failureOf(shortener.create(TARGET))).toMatchObject({
      kind: 'timed_out',
      retryable: true,
    });
  });
});
