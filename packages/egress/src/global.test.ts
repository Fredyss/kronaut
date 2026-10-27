import { createServer, type Server } from 'node:net';
import { getGlobalDispatcher } from 'undici';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { EgressError } from './errors.ts';
import { installGlobalDispatcher } from './global.ts';

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
  installGlobalDispatcher();
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

beforeEach(() => {
  connections = 0;
});

async function causeOf(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return (error as Error).cause ?? error;
  }
  throw new Error('expected the promise to reject');
}

describe('installGlobalDispatcher', () => {
  it('is idempotent', () => {
    const first = getGlobalDispatcher();
    installGlobalDispatcher();
    installGlobalDispatcher();
    expect(getGlobalDispatcher()).toBe(first);
  });

  it('range-checks a stray global fetch to a hostname resolving to loopback', async () => {
    const cause = await causeOf(fetch(`https://localhost:${port}/`));
    expect(cause).toBeInstanceOf(EgressError);
    expect((cause as EgressError).code).toBe('blocked_address');
    expect(connections).toBe(0);
  });

  it('range-checks a stray global fetch to a loopback ip literal', async () => {
    const cause = await causeOf(fetch(`https://127.0.0.1:${port}/`));
    expect(cause).toBeInstanceOf(EgressError);
    expect((cause as EgressError).code).toBe('blocked_address');
    expect(connections).toBe(0);
  });

  it('range-checks a stray global fetch to a private ipv6 literal', async () => {
    const cause = await causeOf(fetch(`https://[::1]:${port}/`));
    expect(cause).toBeInstanceOf(EgressError);
    expect((cause as EgressError).code).toBe('blocked_address');
    expect(connections).toBe(0);
  });

  it('range-checks plain http as well', async () => {
    const cause = await causeOf(fetch(`http://127.0.0.1:${port}/`));
    expect(cause).toBeInstanceOf(EgressError);
    expect((cause as EgressError).code).toBe('blocked_address');
    expect(connections).toBe(0);
  });
});
