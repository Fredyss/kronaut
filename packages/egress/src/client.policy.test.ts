import { describe, expect, it } from 'vitest';
import { agent, clientWith, expectEgress, ORIGIN, useMockAgent } from './testing.ts';

useMockAgent();

describe('host allowlist', () => {
  it('allows an exact host and returns the body', async () => {
    agent.get(ORIGIN).intercept({ path: '/v1', method: 'GET' }).reply(200, '{"ok":true}');
    const response = await clientWith().request(`${ORIGIN}/v1`);
    expect(response.status).toBe(200);
    expect(response.url).toBe(`${ORIGIN}/v1`);
    expect(response.redirected).toBe(false);
    expect(await response.json()).toEqual({ ok: true });
  });

  it('is case-insensitive for the request host and the allowlist entry', async () => {
    agent.get(ORIGIN).intercept({ path: '/', method: 'GET' }).reply(200, 'ok');
    const client = clientWith({ allowedHosts: ['API.Example.com'] });
    const response = await client.request('https://API.EXAMPLE.COM/');
    expect(await response.text()).toBe('ok');
  });

  it('rejects hosts that are not listed', async () => {
    await expectEgress(clientWith().request('https://other.example.com/'), 'blocked_host');
    await expectEgress(clientWith().request('https://api.example.com.evil.net/'), 'blocked_host');
    await expectEgress(clientWith().request('https://sub.api.example.com/'), 'blocked_host');
  });

  it('matches wildcard entries against subdomains only', async () => {
    const client = clientWith({ allowedHosts: ['*.example.com'] });
    for (const host of ['a.example.com', 'a.b.example.com']) {
      agent.get(`https://${host}`).intercept({ path: '/', method: 'GET' }).reply(200, host);
      const response = await client.request(`https://${host}/`);
      expect(await response.text()).toBe(host);
    }
    for (const host of [
      'example.com',
      'evilexample.com',
      'example.com.evil.net',
      'a.example.com.evil.net',
      'a.example.org',
    ]) {
      await expectEgress(client.request(`https://${host}/`), 'blocked_host');
    }
  });

  it('rejects a wildcard match with an empty label', async () => {
    const client = clientWith({ allowedHosts: ['*.example.com'] });
    await expectEgress(client.request('https://.example.com/'), 'blocked_host');
    await expectEgress(client.request('https://a..example.com/'), 'blocked_host');
  });

  it('allows any non-ip host when the policy is any', async () => {
    agent.get('https://anything.test').intercept({ path: '/', method: 'GET' }).reply(200, 'ok');
    const response = await clientWith({ allowedHosts: 'any' }).request('https://anything.test/');
    expect(response.status).toBe(200);
  });

  it('rejects everything for an empty allowlist', async () => {
    await expectEgress(clientWith({ allowedHosts: [] }).request(`${ORIGIN}/`), 'blocked_host');
  });

  it('rejects ip literals even when the policy is any', async () => {
    const client = clientWith({ allowedHosts: 'any' });
    for (const url of [
      'https://8.8.8.8/',
      'https://127.0.0.1/',
      'https://2130706433/',
      'https://0x7f.1/',
      'https://[::1]/',
      'https://[2606:4700:4700::1111]/',
      'https://[::ffff:8.8.8.8]/',
    ]) {
      await expectEgress(client.request(url), 'blocked_host');
    }
  });

  it('rejects an unparseable url', async () => {
    await expectEgress(clientWith().request('not a url'), 'blocked_host');
  });
});

describe('scheme, port and credentials', () => {
  it('rejects non-https schemes', async () => {
    const client = clientWith({ allowedHosts: 'any' });
    await expectEgress(client.request('http://api.example.com/'), 'blocked_scheme');
    await expectEgress(client.request('ftp://api.example.com/'), 'blocked_scheme');
    await expectEgress(client.request('file:///etc/passwd'), 'blocked_scheme');
  });

  it('rejects ports outside the default allowlist', async () => {
    await expectEgress(clientWith().request('https://api.example.com:8443/'), 'blocked_port');
    await expectEgress(clientWith().request('https://api.example.com:80/'), 'blocked_port');
  });

  it('treats an explicit :443 as the default port', async () => {
    agent.get(ORIGIN).intercept({ path: '/', method: 'GET' }).reply(200, 'ok');
    const response = await clientWith().request('https://api.example.com:443/');
    expect(response.status).toBe(200);
  });

  it('allows ports listed in allowedPorts and only those', async () => {
    const client = clientWith({ allowedPorts: [8443] });
    agent
      .get('https://api.example.com:8443')
      .intercept({ path: '/', method: 'GET' })
      .reply(200, 'ok');
    expect((await client.request('https://api.example.com:8443/')).status).toBe(200);
    await expectEgress(client.request(`${ORIGIN}/`), 'blocked_port');
  });

  it('rejects credentials in the url', async () => {
    const client = clientWith();
    await expectEgress(client.request('https://user:pass@api.example.com/'), 'blocked_host');
    await expectEgress(client.request('https://user@api.example.com/'), 'blocked_host');
    await expectEgress(client.request('https://:pass@api.example.com/'), 'blocked_host');
  });
});
