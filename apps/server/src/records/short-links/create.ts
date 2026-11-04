import type { Keyring } from '@kronaut/credentials';
import type { Actor, Database } from '@kronaut/db';
import type { HttpClient } from '@kronaut/egress';
import { openShortenerKey } from '../../infrastructure/credentials/shortener-key.ts';
import { classifyShortenerFailure, ShortenerFailed } from './failure.ts';
import {
  type LinkOutcome,
  type LinkScope,
  type PendingLink,
  pendingLinks,
  recordLinks,
  settleLink,
} from './links.ts';
import { createShortener, type Shortener } from './shortener.ts';
import { loadShortener, type StoredShortener } from './store.ts';
import { dubExternalId } from './target.ts';

const SYSTEM: Actor = { kind: 'system' };

export interface ShortLinkDeps {
  readonly db: Database;
  readonly keyring: Keyring;
  readonly http: HttpClient;
}

export interface LinkRequest extends LinkScope {
  readonly source: string;
  readonly links: readonly string[];
  readonly signal?: AbortSignal | undefined;
}

interface Loaded {
  readonly stored: StoredShortener;
  readonly pending: readonly PendingLink[];
}

function load(deps: ShortLinkDeps, request: LinkRequest): Promise<Loaded | null> {
  return deps.db.withTenant(request.workspaceId, SYSTEM, async (trx) => {
    const stored = await loadShortener(trx, request.workspaceId);
    if (stored === null) return null;
    await recordLinks(trx, request, request.source, request.links);
    return { stored, pending: await pendingLinks(trx, request) };
  });
}

function shortenerOf(deps: ShortLinkDeps, request: LinkRequest, stored: StoredShortener) {
  const key = openShortenerKey(
    deps.keyring,
    { shortenerId: stored.id, workspaceId: request.workspaceId, provider: stored.provider },
    stored,
  );
  return createShortener({
    http: deps.http,
    config: { provider: stored.provider, baseUrl: stored.base_url, domain: stored.domain, key },
    signal: request.signal,
  });
}

async function shorten(
  shortener: Shortener | null,
  request: LinkRequest,
  { stored, link }: { readonly stored: StoredShortener; readonly link: PendingLink },
): Promise<LinkOutcome> {
  if (shortener === null) return { kind: 'failed', failure: new ShortenerFailed('unauthorized') };
  const externalId =
    stored.provider === 'dub' ? dubExternalId(request.destinationId, link.url_sha256) : undefined;
  try {
    return { kind: 'ready', link: await shortener.create(link.target, externalId) };
  } catch (error) {
    return { kind: 'failed', failure: classifyShortenerFailure(error, request.signal) };
  }
}

function openedShortener(deps: ShortLinkDeps, request: LinkRequest, stored: StoredShortener) {
  try {
    return shortenerOf(deps, request, stored);
  } catch {
    return null;
  }
}

export async function createLinks(deps: ShortLinkDeps, request: LinkRequest): Promise<number> {
  const loaded = await load(deps, request);
  if (loaded === null || loaded.pending.length === 0) return 0;
  const { stored, pending } = loaded;
  const shortener = openedShortener(deps, request, stored);
  let left = 0;
  for (const link of pending) {
    if (request.signal?.aborted === true) {
      left++;
      continue;
    }
    const outcome = await shorten(shortener, request, { stored, link });
    const stays = await deps.db.withTenant(request.workspaceId, SYSTEM, (trx) =>
      settleLink(trx, request, link.url_sha256, outcome),
    );
    if (stays) left++;
  }
  return left;
}
