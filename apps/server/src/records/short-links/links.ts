import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import type { ShortenerFailed } from './failure.ts';
import type { CreatedLink } from './shortener.ts';
import { LONG_URL_MAX, linkHash, utmTarget } from './target.ts';

const LINK_ATTEMPTS = 3;

export interface LinkScope {
  readonly workspaceId: string;
  readonly destinationId: string;
}

export interface PendingLink {
  readonly url_sha256: Buffer;
  readonly target: string;
}

export type LinkOutcome =
  | { readonly kind: 'ready'; readonly link: CreatedLink }
  | { readonly kind: 'failed'; readonly failure: ShortenerFailed };

function rowOf(scope: LinkScope, link: string, source: string) {
  const target = utmTarget(link, source);
  return {
    workspace_id: scope.workspaceId,
    destination_id: scope.destinationId,
    url_sha256: linkHash(link),
    long_url: link,
    target: target ?? link,
    ...(target === null ? { state: 'failed', error_code: 'refused' } : {}),
  };
}

export async function recordLinks(
  trx: TenantDb,
  scope: LinkScope,
  source: string,
  links: readonly string[],
): Promise<void> {
  const fitting = links.filter((link) => link.length <= LONG_URL_MAX);
  if (fitting.length === 0) return;
  await trx
    .insertInto('short_links')
    .values(fitting.map((link) => rowOf(scope, link, source)))
    .onConflict((oc) => oc.columns(['workspace_id', 'destination_id', 'url_sha256']).doNothing())
    .execute();
}

export function pendingLinks(trx: TenantDb, scope: LinkScope): Promise<PendingLink[]> {
  return trx
    .selectFrom('short_links')
    .select(['url_sha256', 'target'])
    .where('workspace_id', '=', scope.workspaceId)
    .where('destination_id', '=', scope.destinationId)
    .where('state', '=', 'pending')
    .where('attempts', '<', LINK_ATTEMPTS)
    .orderBy('created_at')
    .orderBy('url_sha256')
    .execute();
}

function outcomeColumns(outcome: LinkOutcome) {
  if (outcome.kind === 'ready') {
    return {
      state: 'ready',
      short_url: outcome.link.shortUrl,
      link_id: outcome.link.linkId,
      error_code: null,
    };
  }
  const { kind, retryable } = outcome.failure;
  const stays = sql<boolean>`${retryable} and attempts + 1 < ${LINK_ATTEMPTS}`;
  return {
    state: sql<string>`case when ${stays} then 'pending' else 'failed' end`,
    error_code: sql<string | null>`case when ${stays} then null else ${kind} end`,
  };
}

export async function settleLink(
  trx: TenantDb,
  scope: LinkScope,
  hash: Buffer,
  outcome: LinkOutcome,
): Promise<boolean> {
  const row = await trx
    .updateTable('short_links')
    .set({ ...outcomeColumns(outcome), attempts: sql<number>`attempts + 1` })
    .where('workspace_id', '=', scope.workspaceId)
    .where('destination_id', '=', scope.destinationId)
    .where('url_sha256', '=', hash)
    .where('state', '=', 'pending')
    .returning('state')
    .executeTakeFirst();
  return row?.state === 'pending';
}

export async function readyLinks(trx: TenantDb, scope: LinkScope): Promise<Map<string, string>> {
  const rows = await trx
    .selectFrom('short_links')
    .select(['long_url', 'short_url'])
    .where('workspace_id', '=', scope.workspaceId)
    .where('destination_id', '=', scope.destinationId)
    .where('state', '=', 'ready')
    .execute();
  return new Map(
    rows.flatMap((row) => (row.short_url === null ? [] : [[row.long_url, row.short_url]])),
  );
}
