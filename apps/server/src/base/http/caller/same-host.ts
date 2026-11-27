import { HttpError } from '../errors.ts';

// A browser on another site can reach the server through DNS rebinding with its own Host, and a
// cross-site request carries its Origin; neither belongs on a route meant for API clients.
export function checkSameHost(origin: string, request: Request, url: URL): void {
  const expected = new URL(origin);
  const header = request.headers.get('host')?.toLowerCase() ?? null;
  const from = request.headers.get('origin');
  if (url.host !== expected.host || (header !== null && header !== expected.host)) {
    throw new HttpError('forbidden', 'This host may not use this endpoint.');
  }
  if (from !== null && from !== expected.origin) {
    throw new HttpError('forbidden', 'This origin may not use this endpoint.');
  }
}
