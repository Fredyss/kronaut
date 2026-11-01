import type { Database } from '@kronaut/db';
import type { Logger } from 'pino';
import type { Temporal } from 'temporal-polyfill';
import type { ProviderRegistry } from '../providers.ts';

const WORKSPACE_PAGE = 1000;

export interface JobDeps {
  readonly db: Database;
  readonly logger: Logger;
  readonly providers: ProviderRegistry;
  readonly now: () => Temporal.Instant;
}

interface WorkspaceSweep {
  readonly db: Database;
  readonly logger: Logger;
  readonly task: string;
}

async function sweepWorkspaces(
  sweep: WorkspaceSweep,
  visit: (workspaceId: string) => Promise<void>,
): Promise<number> {
  let failed = 0;
  let after: string | null = null;
  for (;;) {
    const page = await sweep.db.sweeps.workspaces(after, WORKSPACE_PAGE);
    for (const workspaceId of page) {
      try {
        await visit(workspaceId);
      } catch {
        failed++;
        sweep.logger.error({ task: sweep.task }, 'a workspace could not be swept');
      }
    }
    after = page.at(-1) ?? null;
    if (page.length < WORKSPACE_PAGE) return failed;
  }
}

export async function sweepCron(
  deps: Pick<JobDeps, 'db' | 'logger'>,
  task: string,
  counts: Record<string, number> & { failed: number },
  visit: (workspaceId: string) => Promise<void>,
): Promise<string> {
  counts.failed += await sweepWorkspaces({ db: deps.db, logger: deps.logger, task }, visit);
  const detail = JSON.stringify(counts);
  if (counts.failed > 0) throw new Error(detail);
  return detail;
}
