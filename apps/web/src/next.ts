const PROBE_ORIGIN = 'http://kronaut.invalid';

export function safeNext(raw: unknown): string {
  if (typeof raw !== 'string' || !raw.startsWith('/') || raw.startsWith('//')) return '/';
  if (raw.includes('\\')) return '/';
  let url: URL;
  try {
    url = new URL(raw, PROBE_ORIGIN);
  } catch {
    return '/';
  }
  if (url.origin !== PROBE_ORIGIN || url.pathname === '/login') return '/';
  return `${url.pathname}${url.search}${url.hash}`;
}
