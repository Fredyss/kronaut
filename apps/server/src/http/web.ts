import { readdirSync, readFileSync } from 'node:fs';
import { extname, join, relative, sep } from 'node:path';
import { ConfigError } from '../config.ts';

export interface WebApp {
  serve(request: Request, base: Headers): Response | null;
}

interface WebFile {
  readonly body: Uint8Array;
  readonly type: string;
}

const INDEX = '/index.html';
const IMMUTABLE = 'public, max-age=31536000, immutable';
const RESERVED_EXACT: ReadonlySet<string> = new Set(['/healthz', '/readyz']);
const RESERVED_PREFIXES: readonly string[] = ['/v1/', '/oauth/', '/.well-known/'];
const TYPES: Readonly<Record<string, string>> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
};

export function webCsp(mediaUrl: URL): string {
  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    `img-src 'self' ${mediaUrl.origin} data:`,
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "require-trusted-types-for 'script'",
    'trusted-types default',
  ].join('; ');
}

function reserved(path: string): boolean {
  return (
    RESERVED_EXACT.has(path) ||
    path === '/v1' ||
    path === '/oauth' ||
    RESERVED_PREFIXES.some((prefix) => path.startsWith(prefix))
  );
}

function acceptsHtml(request: Request): boolean {
  return (request.headers.get('accept') ?? '').toLowerCase().includes('text/html');
}

function collect(root: string): Map<string, WebFile> {
  const files = new Map<string, WebFile>();
  for (const entry of readdirSync(root, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() || entry.name.startsWith('.')) continue;
    const full = join(entry.parentPath, entry.name);
    const path = `/${relative(root, full).split(sep).join('/')}`;
    if (path.split('/').some((segment) => segment.startsWith('.'))) continue;
    const type = TYPES[extname(entry.name).toLowerCase()];
    if (type === undefined) continue;
    files.set(path, { body: readFileSync(full), type });
  }
  return files;
}

export function loadWebApp(root: string, mediaUrl: URL): WebApp {
  let files: Map<string, WebFile>;
  try {
    files = collect(root);
  } catch {
    throw new ConfigError('KRONAUT_WEB_DIR', 'cannot read the directory');
  }
  const index = files.get(INDEX);
  if (index === undefined) throw new ConfigError('KRONAUT_WEB_DIR', 'has no index.html');
  const csp = webCsp(mediaUrl);

  const send = (file: WebFile, cache: string, base: Headers, document: boolean): Response => {
    const headers = new Headers(base);
    headers.set('Content-Type', file.type);
    headers.set('Cache-Control', cache);
    headers.set('X-Content-Type-Options', 'nosniff');
    if (document) {
      headers.set('Content-Security-Policy', csp);
      headers.set('Referrer-Policy', 'same-origin');
    }
    return new Response(file.body, { status: 200, headers });
  };

  return {
    serve(request, base) {
      if (request.method !== 'GET') return null;
      const path = new URL(request.url).pathname;
      if (reserved(path)) return null;
      const file = path === INDEX ? undefined : files.get(path);
      if (file !== undefined) {
        const cache = path.startsWith('/assets/') ? IMMUTABLE : 'no-cache';
        return send(file, cache, base, file.type.startsWith('text/html'));
      }
      if (!acceptsHtml(request)) return null;
      return send(index, 'no-cache', base, true);
    },
  };
}
