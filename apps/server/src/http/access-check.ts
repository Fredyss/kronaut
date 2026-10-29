import type { Logger } from 'pino';
import { ACCESS_HEADER, type AccessGate } from './access.ts';
import { HttpError } from './errors.ts';

const ACCESS_DENIED = 'Access denied.';
const PROBE_PATHS: ReadonlySet<string> = new Set(['/healthz', '/readyz']);
const OAUTH_DOCUMENT = /^\/oauth\/[a-z0-9_]{2,32}\/[A-Za-z0-9._-]{1,64}$/;
const META_CALLBACK = /^\/v1\/meta\/(facebook|instagram|threads)\/(deletion|deauthorize)$/;
const META_STATUS = /^\/v1\/meta\/deletion\/[A-Z2-7]{20}$/;

export function accessExempt(method: string, path: string): boolean {
  if (method === 'POST') return META_CALLBACK.test(path);
  if (method !== 'GET') return false;
  return PROBE_PATHS.has(path) || OAUTH_DOCUMENT.test(path) || META_STATUS.test(path);
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
