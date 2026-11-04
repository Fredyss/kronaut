import type { HttpClient } from '@kronaut/egress';
import type { Task } from 'graphile-worker';
import * as z from 'zod';
import { SYSTEM } from '../../../access/post-access/lock.ts';
import type { DestinationJob } from '../../../infrastructure/jobs/jobs.ts';
import { createLinks } from '../../../records/short-links/create.ts';
import type { PublishDeps } from '../task.ts';
import { type LinkSource, linkSource } from './source.ts';

const ENSURE_BUDGET_MS = 10_000;
const FIRST_CLAIM_STATES: ReadonlySet<string> = new Set(['scheduled', 'retry_wait']);

export interface ShortLinksConfig {
  readonly http: HttpClient;
  readonly budgetMs?: number;
}

const PayloadSchema = z.object({ workspaceId: z.uuid(), id: z.uuid() });

function create(
  deps: PublishDeps,
  shortLinks: ShortLinksConfig,
  job: DestinationJob,
  { source, signal }: { readonly source: LinkSource; readonly signal?: AbortSignal },
) {
  return createLinks(
    { db: deps.db, keyring: deps.keyring, http: shortLinks.http },
    {
      workspaceId: job.workspaceId,
      destinationId: job.id,
      source: source.provider,
      links: source.links,
      signal,
    },
  );
}

async function firstClaimSource(deps: PublishDeps, job: DestinationJob) {
  return await deps.db.withTenant(job.workspaceId, SYSTEM, async (trx) => {
    const item = await trx
      .selectFrom('destination_items')
      .select('position')
      .where('workspace_id', '=', job.workspaceId)
      .where('destination_id', '=', job.id)
      .executeTakeFirst();
    if (item !== undefined) return null;
    const source = await linkSource(deps, trx, job);
    return source !== null && FIRST_CLAIM_STATES.has(source.state) ? source : null;
  });
}

// Shortening may only ever fall back to the long link, so nothing here can fail the publish.
export async function ensureShortLinks(deps: PublishDeps, job: DestinationJob): Promise<void> {
  const { shortLinks } = deps;
  if (shortLinks === undefined) return;
  try {
    const source = await firstClaimSource(deps, job);
    if (source === null || source.links.length === 0) return;
    const signal = AbortSignal.timeout(shortLinks.budgetMs ?? ENSURE_BUDGET_MS);
    await create(deps, shortLinks, job, { source, signal });
  } catch {
    deps.logger.warn({ destinationId: job.id }, 'short links were not ensured before the claim');
  }
}

export function shortLinksTask(deps: PublishDeps): Task {
  return async (payload) => {
    const parsed = PayloadSchema.safeParse(payload);
    const { shortLinks } = deps;
    if (!parsed.success || shortLinks === undefined) return;
    const job = parsed.data;
    const source = await deps.db.withTenant(job.workspaceId, SYSTEM, (trx) =>
      linkSource(deps, trx, job),
    );
    if (source === null || source.links.length === 0) return;
    const left = await create(deps, shortLinks, job, { source });
    if (left > 0) throw new Error(`${left} short links are waiting for a retry`);
  };
}
