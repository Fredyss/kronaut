import { createServer, type Server } from 'node:http';
import { getRequestListener } from '@hono/node-server';
import type { Hono } from 'hono';

const DRAIN_MS = 10_000;

type Fetch = Hono['fetch'];

export function listen(fetch: Fetch, port: number): Promise<Server> {
  return new Promise((resolve, reject) => {
    const server = createServer(getRequestListener(fetch));
    server.once('error', reject);
    server.listen(port, () => {
      server.off('error', reject);
      resolve(server);
    });
  });
}

// close() keeps serving a keep-alive socket that was mid-request for as long as its client reuses it
export function drain(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    const force = setTimeout(() => server.closeAllConnections(), DRAIN_MS);
    force.unref();
    server.close((err) => {
      clearTimeout(force);
      if (err) reject(err);
      else resolve();
    });
    server.closeIdleConnections();
  });
}
