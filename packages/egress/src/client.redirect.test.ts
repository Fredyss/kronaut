import { describe, expect, it } from 'vitest';
import { agent, clientWith, expectEgress, ORIGIN, recorder, useMockAgent } from './testing.ts';

useMockAgent();

describe('redirects', () => {
  it('follows a same-origin redirect and reports the final url', async () => {
    const pool = agent.get(ORIGIN);
    pool.intercept({ path: '/a', method: 'GET' }).reply(302, '', { headers: { location: '/b' } });
    pool.intercept({ path: '/b', method: 'GET' }).reply(200, 'done');
    const response = await clientWith().request(`${ORIGIN}/a`);
    expect(response.redirected).toBe(true);
    expect(response.url).toBe(`${ORIGIN}/b`);
    expect(await response.text()).toBe('done');
  });

  it('follows an absolute redirect to another allowed host', async () => {
    agent
      .get(ORIGIN)
      .intercept({ path: '/a', method: 'GET' })
      .reply(301, '', { headers: { location: 'https://cdn.example.com/x' } });
    agent.get('https://cdn.example.com').intercept({ path: '/x', method: 'GET' }).reply(200, 'cdn');
    const client = clientWith({ allowedHosts: ['api.example.com', 'cdn.example.com'] });
    const response = await client.request(`${ORIGIN}/a`);
    expect(response.url).toBe('https://cdn.example.com/x');
    expect(await response.text()).toBe('cdn');
  });

  it('blocks a redirect to a host outside the allowlist', async () => {
    agent
      .get(ORIGIN)
      .intercept({ path: '/a', method: 'GET' })
      .reply(302, '', { headers: { location: 'https://evil.example.net/steal' } });
    await expectEgress(clientWith().request(`${ORIGIN}/a`), 'blocked_host');
  });

  it('blocks a redirect to an ip literal', async () => {
    agent
      .get(ORIGIN)
      .intercept({ path: '/a', method: 'GET' })
      .reply(302, '', { headers: { location: 'https://169.254.169.254/latest/meta-data' } });
    await expectEgress(clientWith().request(`${ORIGIN}/a`), 'blocked_host');
  });

  it('blocks an https to http downgrade', async () => {
    agent
      .get(ORIGIN)
      .intercept({ path: '/a', method: 'GET' })
      .reply(302, '', { headers: { location: 'http://api.example.com/b' } });
    await expectEgress(clientWith().request(`${ORIGIN}/a`), 'blocked_scheme');
  });

  it('blocks a redirect to a disallowed port', async () => {
    agent
      .get(ORIGIN)
      .intercept({ path: '/a', method: 'GET' })
      .reply(302, '', { headers: { location: 'https://api.example.com:8443/b' } });
    await expectEgress(clientWith().request(`${ORIGIN}/a`), 'blocked_port');
  });

  it('blocks a redirect carrying credentials', async () => {
    agent
      .get(ORIGIN)
      .intercept({ path: '/a', method: 'GET' })
      .reply(302, '', { headers: { location: 'https://u:p@api.example.com/b' } });
    await expectEgress(clientWith().request(`${ORIGIN}/a`), 'blocked_host');
  });

  it('stops after maxRedirects hops', async () => {
    const pool = agent.get(ORIGIN);
    for (let hop = 0; hop < 4; hop += 1) {
      pool
        .intercept({ path: `/${hop}`, method: 'GET' })
        .reply(302, '', { headers: { location: `/${hop + 1}` } });
    }
    pool.intercept({ path: '/4', method: 'GET' }).reply(200, 'end');
    await expectEgress(
      clientWith({ maxRedirects: 3 }).request(`${ORIGIN}/0`),
      'too_many_redirects',
    );
  });

  it('allows exactly maxRedirects hops', async () => {
    const pool = agent.get(ORIGIN);
    for (let hop = 0; hop < 3; hop += 1) {
      pool
        .intercept({ path: `/${hop}`, method: 'GET' })
        .reply(302, '', { headers: { location: `/${hop + 1}` } });
    }
    pool.intercept({ path: '/3', method: 'GET' }).reply(200, 'end');
    const response = await clientWith({ maxRedirects: 3 }).request(`${ORIGIN}/0`);
    expect(await response.text()).toBe('end');
  });

  it('refuses every redirect when maxRedirects is zero', async () => {
    agent
      .get(ORIGIN)
      .intercept({ path: '/a', method: 'GET' })
      .reply(302, '', { headers: { location: '/b' } });
    await expectEgress(
      clientWith({ maxRedirects: 0 }).request(`${ORIGIN}/a`),
      'too_many_redirects',
    );
  });

  it('breaks a redirect loop', async () => {
    agent
      .get(ORIGIN)
      .intercept({ path: '/loop', method: 'GET' })
      .reply(302, '', { headers: { location: '/loop' } })
      .persist();
    await expectEgress(
      clientWith({ maxRedirects: 5 }).request(`${ORIGIN}/loop`),
      'too_many_redirects',
    );
  });

  it('returns a redirect status without a location as is', async () => {
    agent.get(ORIGIN).intercept({ path: '/a', method: 'GET' }).reply(302, 'no location');
    const response = await clientWith().request(`${ORIGIN}/a`);
    expect(response.status).toBe(302);
    expect(await response.text()).toBe('no location');
  });

  it('does not follow 300 or 304', async () => {
    const pool = agent.get(ORIGIN);
    pool
      .intercept({ path: '/a', method: 'GET' })
      .reply(300, 'multiple', { headers: { location: '/b' } });
    pool.intercept({ path: '/c', method: 'GET' }).reply(304, '', { headers: { location: '/b' } });
    const client = clientWith();
    expect((await client.request(`${ORIGIN}/a`)).status).toBe(300);
    expect((await client.request(`${ORIGIN}/c`)).status).toBe(304);
  });
});

describe('redirect request rewriting', () => {
  it('drops Authorization and friends across origins and keeps other headers', async () => {
    const hop = recorder();
    agent
      .get(ORIGIN)
      .intercept({ path: '/a', method: 'GET' })
      .reply(302, '', { headers: { location: 'https://cdn.example.com/b' } });
    agent
      .get('https://cdn.example.com')
      .intercept({ path: '/b', method: 'GET' })
      .reply(200, hop.reply);
    const client = clientWith({ allowedHosts: ['api.example.com', 'cdn.example.com'] });
    await client.request(`${ORIGIN}/a`, {
      headers: {
        Authorization: 'Bearer secret',
        Cookie: 'sid=1',
        'Proxy-Authorization': 'Basic abc',
        'X-Api-Key': 'key',
        'X-Trace': 'keep',
      },
      sensitiveHeaders: ['x-API-key'],
    });
    const [seen] = hop.seen;
    expect(seen?.headers.authorization).toBeUndefined();
    expect(seen?.headers.cookie).toBeUndefined();
    expect(seen?.headers['proxy-authorization']).toBeUndefined();
    expect(seen?.headers['x-api-key']).toBeUndefined();
    expect(seen?.headers['x-trace']).toBe('keep');
  });

  it('keeps Authorization on a same-origin redirect', async () => {
    const hop = recorder();
    const pool = agent.get(ORIGIN);
    pool.intercept({ path: '/a', method: 'GET' }).reply(302, '', { headers: { location: '/b' } });
    pool.intercept({ path: '/b', method: 'GET' }).reply(200, hop.reply);
    await clientWith().request(`${ORIGIN}/a`, {
      headers: { Authorization: 'Bearer secret', 'X-Api-Key': 'key' },
      sensitiveHeaders: ['x-api-key'],
    });
    expect(hop.seen[0]?.headers.authorization).toBe('Bearer secret');
    expect(hop.seen[0]?.headers['x-api-key']).toBe('key');
  });

  it('treats a different port or scheme-default as a different origin', async () => {
    const hop = recorder();
    agent
      .get(ORIGIN)
      .intercept({ path: '/a', method: 'GET' })
      .reply(302, '', { headers: { location: 'https://api.example.com:8443/b' } });
    agent
      .get('https://api.example.com:8443')
      .intercept({ path: '/b', method: 'GET' })
      .reply(200, hop.reply);
    const client = clientWith({ allowedPorts: [443, 8443] });
    await client.request(`${ORIGIN}/a`, { headers: { Authorization: 'Bearer secret' } });
    expect(hop.seen[0]?.headers.authorization).toBeUndefined();
  });

  it('turns a POST into a body-less GET on 303', async () => {
    const hop = recorder();
    const pool = agent.get(ORIGIN);
    pool.intercept({ path: '/a', method: 'POST' }).reply(303, '', { headers: { location: '/b' } });
    pool.intercept({ path: '/b', method: 'GET' }).reply(200, hop.reply);
    await clientWith().request(`${ORIGIN}/a`, {
      method: 'POST',
      body: '{"x":1}',
      headers: { 'Content-Type': 'application/json', 'X-Trace': 'keep' },
    });
    expect(hop.seen).toHaveLength(1);
    expect(hop.seen[0]?.method).toBe('GET');
    expect(hop.seen[0]?.body).toBeUndefined();
    expect(hop.seen[0]?.headers['content-type']).toBeUndefined();
    expect(hop.seen[0]?.headers['x-trace']).toBe('keep');
  });

  it.each([301, 302])('turns a POST into a GET on %i', async (status) => {
    const hop = recorder();
    const pool = agent.get(ORIGIN);
    pool
      .intercept({ path: '/a', method: 'POST' })
      .reply(status, '', { headers: { location: '/b' } });
    pool.intercept({ path: '/b', method: 'GET' }).reply(200, hop.reply);
    await clientWith().request(`${ORIGIN}/a`, { method: 'post', body: 'payload' });
    expect(hop.seen[0]?.method).toBe('GET');
    expect(hop.seen[0]?.body).toBeUndefined();
  });

  it.each([307, 308])('keeps method and body on %i', async (status) => {
    const hop = recorder();
    const pool = agent.get(ORIGIN);
    pool
      .intercept({ path: '/a', method: 'POST' })
      .reply(status, '', { headers: { location: '/b' } });
    pool.intercept({ path: '/b', method: 'POST' }).reply(200, hop.reply);
    await clientWith().request(`${ORIGIN}/a`, {
      method: 'POST',
      body: 'payload',
      headers: { 'Content-Type': 'text/plain' },
    });
    expect(hop.seen[0]?.method).toBe('POST');
    expect(hop.seen[0]?.body).toBe('payload');
    expect(hop.seen[0]?.headers['content-type']).toBe('text/plain');
  });

  it('keeps HEAD as HEAD across a redirect', async () => {
    const pool = agent.get(ORIGIN);
    pool.intercept({ path: '/a', method: 'HEAD' }).reply(302, '', { headers: { location: '/b' } });
    pool.intercept({ path: '/b', method: 'HEAD' }).reply(200, '');
    const response = await clientWith().request(`${ORIGIN}/a`, { method: 'HEAD' });
    expect(response.status).toBe(200);
  });
});
