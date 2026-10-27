import { describe, expect, it } from 'vitest';
import { EgressError } from './errors.ts';
import {
  agent,
  clientWith,
  errorOf,
  expectEgress,
  ORIGIN,
  recorder,
  useMockAgent,
} from './testing.ts';

useMockAgent();

describe('response size cap', () => {
  it('rejects when content-length exceeds the cap', async () => {
    agent
      .get(ORIGIN)
      .intercept({ path: '/big', method: 'GET' })
      .reply(200, 'tiny', { headers: { 'content-length': '5000' } });
    await expectEgress(
      clientWith({ maxResponseBytes: 1000 }).request(`${ORIGIN}/big`),
      'response_too_large',
    );
  });

  it('rejects an oversized error response too', async () => {
    agent
      .get(ORIGIN)
      .intercept({ path: '/big', method: 'GET' })
      .reply(500, 'tiny', { headers: { 'content-length': '5000' } });
    await expectEgress(
      clientWith({ maxResponseBytes: 1000 }).request(`${ORIGIN}/big`),
      'response_too_large',
    );
  });

  it('aborts a streamed body that grows past the cap without a content-length', async () => {
    agent.get(ORIGIN).intercept({ path: '/stream', method: 'GET' }).reply(200, 'x'.repeat(5000));
    const response = await clientWith({ maxResponseBytes: 1000 }).request(`${ORIGIN}/stream`);
    expect(response.status).toBe(200);
    await expectEgress(response.bytes(), 'response_too_large');
  });

  it('accepts a body of exactly the cap', async () => {
    agent.get(ORIGIN).intercept({ path: '/exact', method: 'GET' }).reply(200, 'y'.repeat(1000));
    const response = await clientWith({ maxResponseBytes: 1000 }).request(`${ORIGIN}/exact`);
    expect((await response.bytes()).byteLength).toBe(1000);
  });

  it('does not apply the content-length check to HEAD responses', async () => {
    agent
      .get(ORIGIN)
      .intercept({ path: '/big', method: 'HEAD' })
      .reply(200, '', { headers: { 'content-length': '5000000' } });
    const response = await clientWith({ maxResponseBytes: 1000 }).request(`${ORIGIN}/big`, {
      method: 'HEAD',
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('content-length')).toBe('5000000');
  });
});

describe('body reading', () => {
  it('decodes text, bytes and json from the same payload shape', async () => {
    const pool = agent.get(ORIGIN);
    pool.intercept({ path: '/t', method: 'GET' }).reply(200, 'héllo');
    pool.intercept({ path: '/b', method: 'GET' }).reply(200, 'abc');
    pool.intercept({ path: '/j', method: 'GET' }).reply(200, '[1,2,3]');
    const client = clientWith();
    expect(await (await client.request(`${ORIGIN}/t`)).text()).toBe('héllo');
    expect(Array.from(await (await client.request(`${ORIGIN}/b`)).bytes())).toEqual([97, 98, 99]);
    expect(await (await client.request(`${ORIGIN}/j`)).json()).toEqual([1, 2, 3]);
  });

  it('reads the body at most once', async () => {
    agent.get(ORIGIN).intercept({ path: '/once', method: 'GET' }).reply(200, 'once');
    const response = await clientWith().request(`${ORIGIN}/once`);
    expect(await response.text()).toBe('once');
    await expect(response.text()).rejects.toBeInstanceOf(TypeError);
    await expect(response.bytes()).rejects.toBeInstanceOf(TypeError);
    await expect(response.json()).rejects.toBeInstanceOf(TypeError);
  });

  it('exposes response headers', async () => {
    agent
      .get(ORIGIN)
      .intercept({ path: '/h', method: 'GET' })
      .reply(200, 'ok', { headers: { 'x-request-id': 'abc', 'set-cookie': ['a=1', 'b=2'] } });
    const response = await clientWith().request(`${ORIGIN}/h`);
    expect(response.headers.get('x-request-id')).toBe('abc');
    expect(response.headers.getSetCookie()).toEqual(['a=1', 'b=2']);
  });

  it('sends the request body and headers', async () => {
    const hop = recorder();
    agent.get(ORIGIN).intercept({ path: '/post', method: 'POST' }).reply(200, hop.reply);
    await clientWith().request(`${ORIGIN}/post`, {
      method: 'POST',
      body: new TextEncoder().encode('bytes'),
      headers: { 'X-Custom': 'v' },
    });
    expect(hop.seen[0]?.body).toBe('bytes');
    expect(hop.seen[0]?.headers['x-custom']).toBe('v');
  });
});

describe('timeouts and aborts', () => {
  it('fails with timeout when the total time is exceeded', async () => {
    agent.get(ORIGIN).intercept({ path: '/slow', method: 'GET' }).reply(200, 'late').delay(400);
    const started = performance.now();
    await expectEgress(clientWith({ timeoutMs: 50 }).request(`${ORIGIN}/slow`), 'timeout');
    expect(performance.now() - started).toBeLessThan(2000);
  });

  it('counts redirects against one total budget', async () => {
    const pool = agent.get(ORIGIN);
    pool
      .intercept({ path: '/a', method: 'GET' })
      .reply(302, '', { headers: { location: '/b' } })
      .delay(120);
    pool.intercept({ path: '/b', method: 'GET' }).reply(200, 'late').delay(120);
    await expectEgress(clientWith({ timeoutMs: 200 }).request(`${ORIGIN}/a`), 'timeout');
  });

  it('rejects with the caller abort reason when the caller signal fires', async () => {
    agent.get(ORIGIN).intercept({ path: '/slow', method: 'GET' }).reply(200, 'late').delay(400);
    const controller = new AbortController();
    const reason = new Error('caller gave up');
    const pending = clientWith().request(`${ORIGIN}/slow`, { signal: controller.signal });
    setTimeout(() => controller.abort(reason), 20);
    expect(await errorOf(pending)).toBe(reason);
  });

  it('rejects immediately with the reason of an already aborted signal', async () => {
    const reason = new Error('already aborted');
    const error = await errorOf(
      clientWith().request(`${ORIGIN}/never`, { signal: AbortSignal.abort(reason) }),
    );
    expect(error).toBe(reason);
  });
});

describe('error mapping', () => {
  it('maps resolution failures to dns_failure', async () => {
    agent
      .get(ORIGIN)
      .intercept({ path: '/x', method: 'GET' })
      .replyWithError(Object.assign(new Error('getaddrinfo ENOTFOUND'), { code: 'ENOTFOUND' }));
    await expectEgress(clientWith().request(`${ORIGIN}/x`), 'dns_failure');
  });

  it('maps other socket errors to network and keeps the cause', async () => {
    const cause = Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' });
    agent.get(ORIGIN).intercept({ path: '/x', method: 'GET' }).replyWithError(cause);
    const error = await errorOf(clientWith().request(`${ORIGIN}/x`));
    expect(error).toBeInstanceOf(EgressError);
    expect((error as EgressError).code).toBe('network');
    expect((error as EgressError).cause).toBe(cause);
  });

  it('keeps an egress error raised inside the connector', async () => {
    const cause = new EgressError('blocked_address', 'blocked');
    agent
      .get(ORIGIN)
      .intercept({ path: '/x', method: 'GET' })
      .replyWithError(Object.assign(new Error('connect failed'), { cause }));
    await expectEgress(clientWith().request(`${ORIGIN}/x`), 'blocked_address');
  });

  it('never leaks request headers or bodies into error messages', async () => {
    const error = await errorOf(
      clientWith().request('https://evil.example.net/?token=url-secret', {
        method: 'POST',
        body: 'body-secret',
        headers: { Authorization: 'Bearer header-secret' },
      }),
    );
    const text = `${(error as Error).message} ${JSON.stringify(error)}`;
    for (const secret of ['header-secret', 'body-secret', 'url-secret']) {
      expect(text).not.toContain(secret);
    }
  });
});
