import { brotliCompressSync, deflateSync, gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { agent, clientWith, expectEgress, ORIGIN, recorder, useMockAgent } from './testing.ts';

useMockAgent();

describe('fetch adapter', () => {
  it('returns a standard Response with status, headers, url and body', async () => {
    agent
      .get(ORIGIN)
      .intercept({ path: '/f', method: 'GET' })
      .reply(201, '{"id":7}', { headers: { 'content-type': 'application/json' } });
    const response = await clientWith().fetch(`${ORIGIN}/f`);
    expect(response).toBeInstanceOf(Response);
    expect(response.status).toBe(201);
    expect(response.ok).toBe(true);
    expect(response.url).toBe(`${ORIGIN}/f`);
    expect(response.redirected).toBe(false);
    expect(response.headers.get('content-type')).toBe('application/json');
    expect(await response.json()).toEqual({ id: 7 });
  });

  it('follows redirects and reports them', async () => {
    const pool = agent.get(ORIGIN);
    pool.intercept({ path: '/a', method: 'GET' }).reply(302, '', { headers: { location: '/b' } });
    pool.intercept({ path: '/b', method: 'GET' }).reply(200, 'there');
    const response = await clientWith().fetch(new URL(`${ORIGIN}/a`));
    expect(response.redirected).toBe(true);
    expect(response.url).toBe(`${ORIGIN}/b`);
    expect(await response.text()).toBe('there');
  });

  it('sends init method, headers and body', async () => {
    const hop = recorder();
    agent.get(ORIGIN).intercept({ path: '/p', method: 'POST' }).reply(200, hop.reply);
    await clientWith().fetch(`${ORIGIN}/p`, {
      method: 'POST',
      body: JSON.stringify({ a: 1 }),
      headers: { 'Content-Type': 'application/json', 'X-Custom': 'v' },
    });
    expect(hop.seen[0]?.method).toBe('POST');
    expect(hop.seen[0]?.body).toBe('{"a":1}');
    expect(hop.seen[0]?.headers['x-custom']).toBe('v');
    expect(hop.seen[0]?.headers['content-type']).toBe('application/json');
  });

  it('accepts a Request object', async () => {
    const hop = recorder();
    agent.get(ORIGIN).intercept({ path: '/r', method: 'PUT' }).reply(200, hop.reply);
    const request = new Request(`${ORIGIN}/r`, { method: 'PUT', body: 'put-body' });
    const response = await clientWith().fetch(request);
    expect(response.status).toBe(200);
    expect(hop.seen[0]?.body).toBe('put-body');
  });

  it('applies the same guards', async () => {
    const client = clientWith();
    await expectEgress(client.fetch('http://api.example.com/'), 'blocked_scheme');
    await expectEgress(client.fetch('https://other.example.net/'), 'blocked_host');
    await expectEgress(client.fetch('https://127.0.0.1/'), 'blocked_host');
    await expectEgress(client.fetch('https://api.example.com:9999/'), 'blocked_port');
    await expectEgress(client.fetch('https://u:p@api.example.com/'), 'blocked_host');
    await expectEgress(client.fetch(new Request('https://other.example.net/')), 'blocked_host');
  });

  it('blocks redirects to disallowed hosts', async () => {
    agent
      .get(ORIGIN)
      .intercept({ path: '/a', method: 'GET' })
      .reply(302, '', { headers: { location: 'https://evil.example.net/' } });
    await expectEgress(clientWith().fetch(`${ORIGIN}/a`), 'blocked_host');
  });

  it('enforces the size cap while the body is read', async () => {
    agent.get(ORIGIN).intercept({ path: '/big', method: 'GET' }).reply(200, 'z'.repeat(5000));
    const response = await clientWith({ maxResponseBytes: 1000 }).fetch(`${ORIGIN}/big`);
    await expect(response.arrayBuffer()).rejects.toMatchObject({ code: 'response_too_large' });
  });

  it('rejects early on an oversized content-length', async () => {
    agent
      .get(ORIGIN)
      .intercept({ path: '/big', method: 'GET' })
      .reply(200, 'tiny', { headers: { 'content-length': '5000' } });
    await expectEgress(
      clientWith({ maxResponseBytes: 1000 }).fetch(`${ORIGIN}/big`),
      'response_too_large',
    );
  });

  it('builds a body-less Response for 204', async () => {
    agent.get(ORIGIN).intercept({ path: '/n', method: 'DELETE' }).reply(204, '');
    const response = await clientWith().fetch(`${ORIGIN}/n`, { method: 'DELETE' });
    expect(response.status).toBe(204);
    expect(response.body).toBeNull();
  });

  it('honours an abort signal passed in init', async () => {
    agent.get(ORIGIN).intercept({ path: '/slow', method: 'GET' }).reply(200, 'late').delay(400);
    const controller = new AbortController();
    const pending = clientWith().fetch(`${ORIGIN}/slow`, { signal: controller.signal });
    setTimeout(() => controller.abort(new Error('stop')), 20);
    await expect(pending).rejects.toMatchObject({ message: 'stop' });
  });
});

describe('fetch adapter redirect modes', () => {
  it('returns the 3xx response unchanged for manual', async () => {
    agent
      .get(ORIGIN)
      .intercept({ path: '/a', method: 'GET' })
      .reply(302, '', { headers: { location: '/b' } });
    const response = await clientWith().fetch(`${ORIGIN}/a`, { redirect: 'manual' });
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('/b');
    expect(response.redirected).toBe(false);
    expect(response.url).toBe(`${ORIGIN}/a`);
  });

  it('honours the redirect mode of a Request object', async () => {
    agent
      .get(ORIGIN)
      .intercept({ path: '/a', method: 'GET' })
      .reply(307, '', { headers: { location: 'https://evil.example.net/' } });
    const response = await clientWith().fetch(new Request(`${ORIGIN}/a`, { redirect: 'manual' }));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://evil.example.net/');
  });

  it('still applies the content-length cap to a manual 3xx response', async () => {
    agent
      .get(ORIGIN)
      .intercept({ path: '/a', method: 'GET' })
      .reply(302, 'tiny', { headers: { location: '/b', 'content-length': '5000' } });
    await expectEgress(
      clientWith({ maxResponseBytes: 1000 }).fetch(`${ORIGIN}/a`, { redirect: 'manual' }),
      'response_too_large',
    );
  });

  it('still applies the stream cap to a manual 3xx response', async () => {
    agent
      .get(ORIGIN)
      .intercept({ path: '/a', method: 'GET' })
      .reply(302, 'x'.repeat(5000), { headers: { location: '/b' } });
    const response = await clientWith({ maxResponseBytes: 1000 }).fetch(`${ORIGIN}/a`, {
      redirect: 'manual',
    });
    expect(response.status).toBe(302);
    await expect(response.arrayBuffer()).rejects.toMatchObject({ code: 'response_too_large' });
  });

  it('rejects a redirect for error', async () => {
    agent
      .get(ORIGIN)
      .intercept({ path: '/a', method: 'GET' })
      .reply(302, '', { headers: { location: '/b' } });
    await expectEgress(
      clientWith().fetch(`${ORIGIN}/a`, { redirect: 'error' }),
      'too_many_redirects',
    );
  });

  it('lets a non-redirect response through for error', async () => {
    agent.get(ORIGIN).intercept({ path: '/a', method: 'GET' }).reply(200, 'fine');
    const response = await clientWith().fetch(`${ORIGIN}/a`, { redirect: 'error' });
    expect(await response.text()).toBe('fine');
  });

  it('follows redirects for an explicit follow', async () => {
    const pool = agent.get(ORIGIN);
    pool.intercept({ path: '/a', method: 'GET' }).reply(302, '', { headers: { location: '/b' } });
    pool.intercept({ path: '/b', method: 'GET' }).reply(200, 'there');
    const response = await clientWith().fetch(`${ORIGIN}/a`, { redirect: 'follow' });
    expect(response.redirected).toBe(true);
    expect(await response.text()).toBe('there');
  });
});

describe('fetch adapter content decoding', () => {
  const payload = JSON.stringify({ ok: true, text: 'héllo wörld'.repeat(20) });

  function encoded(body: Buffer, coding: string): [Buffer, { headers: Record<string, string> }] {
    return [
      body,
      {
        headers: {
          'content-encoding': coding,
          'content-length': String(body.byteLength),
          'content-type': 'application/json',
        },
      },
    ];
  }

  it('decodes a gzip body and drops the stale headers', async () => {
    const [body, options] = encoded(gzipSync(payload), 'gzip');
    agent.get(ORIGIN).intercept({ path: '/z', method: 'GET' }).reply(200, body, options);
    const response = await clientWith().fetch(`${ORIGIN}/z`, {
      headers: { 'Accept-Encoding': 'gzip' },
    });
    expect(response.headers.get('content-encoding')).toBeNull();
    expect(response.headers.get('content-length')).toBeNull();
    expect(response.headers.get('content-type')).toBe('application/json');
    expect(await response.json()).toEqual(JSON.parse(payload));
  });

  it.each([
    ['deflate', deflateSync],
    ['br', brotliCompressSync],
    ['x-gzip', gzipSync],
    ['GZIP', gzipSync],
  ])('decodes %s', async (coding, compress) => {
    const [body, options] = encoded(compress(payload), coding);
    agent.get(ORIGIN).intercept({ path: '/z', method: 'GET' }).reply(200, body, options);
    const response = await clientWith().fetch(`${ORIGIN}/z`);
    expect(await response.text()).toBe(payload);
  });

  it('decodes stacked codings in reverse order', async () => {
    const [body, options] = encoded(brotliCompressSync(gzipSync(payload)), 'gzip, br');
    agent.get(ORIGIN).intercept({ path: '/z', method: 'GET' }).reply(200, body, options);
    const response = await clientWith().fetch(`${ORIGIN}/z`);
    expect(await response.text()).toBe(payload);
  });

  it('applies the size cap to the decoded bytes', async () => {
    const [body, options] = encoded(gzipSync(Buffer.alloc(2_000_000)), 'gzip');
    expect(body.byteLength).toBeLessThan(5000);
    agent.get(ORIGIN).intercept({ path: '/bomb', method: 'GET' }).reply(200, body, options);
    const response = await clientWith({ maxResponseBytes: 5000 }).fetch(`${ORIGIN}/bomb`);
    await expect(response.arrayBuffer()).rejects.toMatchObject({ code: 'response_too_large' });
  });

  it('accepts a decoded body of exactly the cap', async () => {
    const [body, options] = encoded(gzipSync('a'.repeat(3000)), 'gzip');
    agent.get(ORIGIN).intercept({ path: '/exact', method: 'GET' }).reply(200, body, options);
    const response = await clientWith({ maxResponseBytes: 3000 }).fetch(`${ORIGIN}/exact`);
    expect((await response.arrayBuffer()).byteLength).toBe(3000);
  });

  it('reads an empty encoded body as empty', async () => {
    const [, options] = encoded(Buffer.alloc(0), 'gzip');
    agent.get(ORIGIN).intercept({ path: '/empty', method: 'GET' }).reply(200, '', options);
    const response = await clientWith().fetch(`${ORIGIN}/empty`);
    expect(await response.text()).toBe('');
  });

  it('fails with network on a corrupt encoded body', async () => {
    const [, options] = encoded(Buffer.from('not gzip'), 'gzip');
    agent.get(ORIGIN).intercept({ path: '/bad', method: 'GET' }).reply(200, 'not gzip', options);
    const response = await clientWith().fetch(`${ORIGIN}/bad`);
    await expect(response.text()).rejects.toMatchObject({ code: 'network' });
  });

  it('leaves an unsupported coding untouched', async () => {
    const [body, options] = encoded(Buffer.from('opaque-bytes'), 'zstd');
    agent.get(ORIGIN).intercept({ path: '/zstd', method: 'GET' }).reply(200, body, options);
    const response = await clientWith().fetch(`${ORIGIN}/zstd`);
    expect(response.headers.get('content-encoding')).toBe('zstd');
    expect(await response.text()).toBe('opaque-bytes');
  });

  it('leaves identity untouched', async () => {
    const [body, options] = encoded(Buffer.from('plain'), 'identity');
    agent.get(ORIGIN).intercept({ path: '/id', method: 'GET' }).reply(200, body, options);
    const response = await clientWith().fetch(`${ORIGIN}/id`);
    expect(await response.text()).toBe('plain');
  });

  it('keeps the headers of a HEAD response', async () => {
    const [, options] = encoded(Buffer.alloc(0), 'gzip');
    agent.get(ORIGIN).intercept({ path: '/h', method: 'HEAD' }).reply(200, '', options);
    const response = await clientWith().fetch(`${ORIGIN}/h`, { method: 'HEAD' });
    expect(response.headers.get('content-encoding')).toBe('gzip');
  });

  it('fails with network on too many stacked codings', async () => {
    const [body, options] = encoded(Buffer.from('x'), 'gzip, gzip, gzip, gzip, gzip, gzip');
    agent.get(ORIGIN).intercept({ path: '/deep', method: 'GET' }).reply(200, body, options);
    await expectEgress(clientWith().fetch(`${ORIGIN}/deep`), 'network');
  });
});
