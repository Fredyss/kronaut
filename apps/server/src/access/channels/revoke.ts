import type { Actor, TenantDb } from '@kronaut/db';
import { toProviderFailure } from '@kronaut/providers/failure';
import type { Task } from 'graphile-worker';
import * as z from 'zod';
import {
  createBaseContext,
  PROVIDER_EGRESS,
  type ProviderEntry,
} from '../../base/providers/providers.ts';
import {
  loadCredentialById,
  loadProviderApp,
} from '../../infrastructure/credentials/credential-store.ts';
import type { RevokeJob } from '../../infrastructure/jobs/jobs.ts';
import type { PublishDeps } from '../../steps/publish/task.ts';

export const GRANT_REVOKED = 'grant_revoked';

export interface SiblingFlag {
  readonly workspaceId: string;
  readonly socialAccountId: string;
  readonly fence: { readonly id: string; readonly version: number };
  readonly incident: 'auth_revoked';
  readonly statusReason: typeof GRANT_REVOKED;
}

export type RevokeDeps = Pick<
  PublishDeps,
  'db' | 'keyring' | 'providers' | 'logger' | 'publicBaseUrl' | 'now'
> & {
  readonly flagAccount: (trx: TenantDb, target: SiblingFlag) => Promise<boolean>;
};

export type RevokeOutcome = 'revoked' | 'skipped' | 'refused';

const SYSTEM: Actor = { kind: 'system' };
const RETRIED = new Set(['transient', 'rate_limited', 'ambiguous']);

const PayloadSchema = z.object({
  workspaceId: z.uuid(),
  id: z.uuid(),
  version: z.number().int().positive(),
});

interface Revocable {
  readonly entry: ProviderEntry;
  readonly provider: string;
  readonly input: Parameters<NonNullable<ProviderEntry['runtime']['revoke']>>[1];
}

function load(deps: RevokeDeps, job: RevokeJob): Promise<Revocable | null> {
  const { workspaceId } = job;
  return deps.db.withTenant(workspaceId, SYSTEM, async (trx) => {
    const row = await loadCredentialById(trx, deps.keyring, { workspaceId, credentialId: job.id });
    if (row === null || row.version !== job.version) return null;
    const account = await trx
      .selectFrom('social_accounts')
      .select('status')
      .where('workspace_id', '=', workspaceId)
      .where('id', '=', row.socialAccountId)
      .executeTakeFirst();
    const entry = deps.providers.get(row.provider);
    if (account?.status !== 'disconnected' || entry?.runtime.revoke === undefined) return null;
    const app = await loadProviderApp(
      trx,
      deps.keyring,
      { id: row.providerAppId },
      { publicBaseUrl: deps.publicBaseUrl, keys: { use: 'bound', keyId: row.clientKeyId } },
    );
    if (app === null) return null;
    return {
      entry,
      provider: row.provider,
      input: {
        app: app.app,
        account: {
          providerAccountId: row.providerAccountId,
          ...(row.handle === null ? {} : { handle: row.handle }),
        },
        credentials: entry.runtime.parseCredentials(row.value),
      },
    };
  });
}

function parsedOrNull(entry: ProviderEntry, value: unknown): unknown {
  try {
    return entry.runtime.parseCredentials(value);
  } catch (err) {
    if (!(err instanceof Error) || err.name !== 'ZodError') throw err;
    return null;
  }
}

async function flagSiblings(deps: RevokeDeps, job: RevokeJob, target: Revocable): Promise<number> {
  const { entry } = target;
  const shares = entry.runtime.sharesGrant;
  if (shares === undefined || entry.manifest.dataRetention === undefined) return 0;
  const { workspaceId } = job;
  return await deps.db.withTenant(workspaceId, SYSTEM, async (trx) => {
    const rows = await trx
      .selectFrom('account_credentials as c')
      .innerJoin('social_accounts as a', (join) =>
        join
          .onRef('a.workspace_id', '=', 'c.workspace_id')
          .onRef('a.id', '=', 'c.social_account_id'),
      )
      .select('c.id')
      .where('c.workspace_id', '=', workspaceId)
      .where('c.id', '<>', job.id)
      .where('c.kind', '=', entry.manifest.auth.kind)
      .where('a.provider', '=', target.provider)
      .where('a.status', '=', 'active')
      .execute();
    let flagged = 0;
    for (const row of rows) {
      const other = await loadCredentialById(trx, deps.keyring, {
        workspaceId,
        credentialId: row.id,
      });
      const credentials = other === null ? null : parsedOrNull(entry, other.value);
      if (other === null || credentials === null) continue;
      if (!shares(target.input.credentials, credentials)) continue;
      const done = await deps.flagAccount(trx, {
        workspaceId,
        socialAccountId: other.socialAccountId,
        fence: { id: other.id, version: other.version },
        incident: 'auth_revoked',
        statusReason: GRANT_REVOKED,
      });
      if (done) flagged++;
    }
    return flagged;
  });
}

export async function runRevoke(deps: RevokeDeps, job: RevokeJob): Promise<RevokeOutcome> {
  const target = await load(deps, job);
  if (target === null) return 'skipped';
  const { entry, input } = target;
  const logger = deps.logger.child({ credentialId: job.id, provider: target.provider });
  const signal = AbortSignal.timeout(PROVIDER_EGRESS.timeoutMs);
  try {
    await entry.runtime.revoke?.(createBaseContext(entry, logger, signal, deps.now), input);
  } catch (err) {
    const error = toProviderFailure(err, 'private').error;
    if (RETRIED.has(error.kind)) throw new Error(`revoking the token failed: ${error.kind}`);
    logger.warn(
      { reason: error.kind, code: 'code' in error ? error.code : undefined },
      'the network refused to revoke the token; the credentials stay until the retention purge',
    );
    return 'refused';
  }
  const siblings = await flagSiblings(deps, job, target);
  logger.info({ siblings }, 'revoked the token of a disconnected channel');
  return 'revoked';
}

export function revokeTask(deps: RevokeDeps): Task {
  return async (payload) => {
    const parsed = PayloadSchema.safeParse(payload);
    if (!parsed.success) {
      deps.logger.error('revoke job payload is invalid');
      return;
    }
    await runRevoke(deps, parsed.data);
  };
}
