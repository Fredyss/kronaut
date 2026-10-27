import { createServer, type Server } from 'node:net';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createHttpClient } from './client.ts';
import { EgressError, type EgressErrorCode } from './errors.ts';
import type { Resolver } from './lookup.ts';
import type { EgressPolicy } from './policy.ts';

let server: Server;
let port = 0;
let connections = 0;

beforeAll(async () => {
  server = createServer((socket) => {
    connections += 1;
    socket.destroy();
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  port = typeof address === 'object' && address !== null ? address.port : 0;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

beforeEach(() => {
  connections = 0;
});

function policy(overrides: Partial<EgressPolicy> = {}): EgressPolicy {
  return {
    allowedHosts: ['rebind.example.test', 'localhost'],
    allowedPorts: [port],
    maxResponseBytes: 1024,
    timeoutMs: 5000,
    maxRedirects: 3,
    ...overrides,
  };
}

async function expectEgress(promise: Promise<unknown>, code: EgressErrorCode): Promise<void> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(EgressError);
    expect((error as EgressError).code).toBe(code);
    return;
  }
  throw new Error('expected the promise to reject');
}

describe('default dispatcher against real sockets', () => {
  it('blocks a hostname that resolves to loopback before connecting', async () => {
    const resolver: Resolver = async () => [{ address: '127.0.0.1', family: 4 }];
    const client = createHttpClient(policy(), { resolver });
    await expectEgress(client.request(`https://rebind.example.test:${port}/`), 'blocked_address');
    expect(connections).toBe(0);
  });

  it('blocks when only one of several resolved addresses is private', async () => {
    const resolver: Resolver = async () => [
      { address: '93.184.216.34', family: 4 },
      { address: '127.0.0.1', family: 4 },
    ];
    const client = createHttpClient(policy(), { resolver });
    await expectEgress(client.request(`https://rebind.example.test:${port}/`), 'blocked_address');
    expect(connections).toBe(0);
  });

  it('blocks an ipv4-mapped loopback answer', async () => {
    const resolver: Resolver = async () => [{ address: '::ffff:127.0.0.1', family: 6 }];
    const client = createHttpClient(policy(), { resolver });
    await expectEgress(client.request(`https://rebind.example.test:${port}/`), 'blocked_address');
    expect(connections).toBe(0);
  });

  it('blocks localhost through the real resolver before connecting', async () => {
    const client = createHttpClient(policy());
    await expectEgress(client.request(`https://localhost:${port}/`), 'blocked_address');
    expect(connections).toBe(0);
  });

  it('blocks localhost through the real resolver on the fetch adapter too', async () => {
    const client = createHttpClient(policy());
    await expectEgress(client.fetch(`https://localhost:${port}/`), 'blocked_address');
    expect(connections).toBe(0);
  });

  it('blocks ip literals before any resolution or connection', async () => {
    let resolved = 0;
    const resolver: Resolver = async () => {
      resolved += 1;
      return [{ address: '127.0.0.1', family: 4 }];
    };
    const client = createHttpClient(policy({ allowedHosts: 'any' }), { resolver });
    await expectEgress(client.request(`https://127.0.0.1:${port}/`), 'blocked_host');
    await expectEgress(client.request(`https://[::1]:${port}/`), 'blocked_host');
    expect(resolved).toBe(0);
    expect(connections).toBe(0);
  });

  it('reports dns_failure for an empty answer and for a failing resolver', async () => {
    const empty = createHttpClient(policy(), { resolver: async () => [] });
    await expectEgress(empty.request(`https://rebind.example.test:${port}/`), 'dns_failure');
    const failing = createHttpClient(policy(), {
      resolver: async () => {
        throw new Error('servfail');
      },
    });
    await expectEgress(failing.request(`https://rebind.example.test:${port}/`), 'dns_failure');
    expect(connections).toBe(0);
  });

  it('re-resolves on every request so a rebinding answer is caught on the second call', async () => {
    let calls = 0;
    const resolver: Resolver = async () => {
      calls += 1;
      return [{ address: calls === 1 ? '10.0.0.1' : '127.0.0.1', family: 4 }];
    };
    const client = createHttpClient(policy(), { resolver });
    await expectEgress(client.request(`https://rebind.example.test:${port}/`), 'blocked_address');
    await expectEgress(client.request(`https://rebind.example.test:${port}/`), 'blocked_address');
    expect(calls).toBe(2);
    expect(connections).toBe(0);
  });
});
