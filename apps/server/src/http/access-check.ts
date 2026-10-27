import type { Logger } from 'pino';
import { ACCESS_HEADER, type AccessGate } from './access.ts';
import { HttpError } from './errors.ts';

const ACCESS_DENIED = 'Access denied.';
const PROBE_PATHS: ReadonlySet<string> = new Set(['/healthz', '/readyz']);
const OAUTH_DOCUMENT = /^\/oauth\/[a-z0-9_]{2,32}\/[A-Za-z0-9._-]{1,64}$/;

export function accessExempt(method: string, path: string): boolean {
  return method === 'GET' && (PROBE_PATHS.has(path) || OAUTH_DOCUMENT.test(path));
}

export async function checkAccess(
  gate: AccessGate | undefined,
  request: Request,
  url: URL,
  logger: Logger,
): Promise<void> {
  if (gate !== undefined && !accessExempt(request.method, url.pathname)) {
    const verdict = await gate.verify(request.headers.get(ACCESS_HEADER));
    if (!verdict.ok) {
      logger.warn({ reason: verdict.reason }, 'Access assertion rejected');
      throw new HttpError('forbidden', ACCESS_DENIED);
    }
  }
}
