import type { ConnectedAccount } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import { Temporal } from 'temporal-polyfill';
import * as z from 'zod';
import { newState, openPending, type PendingRecord, sealPending, sha256Hex } from '../connect.ts';
import { ConnectFailure } from '../connect-failure.ts';
import { type ChannelRouteDeps, SYSTEM } from '../deps.ts';

const SELECTION_TTL_SECONDS = 900;
export const MAX_SELECTION_CANDIDATES = 500;

const StoredSelectionSchema = z.object({
  workspace_id: z.string(),
  user_id: z.string(),
  provider: z.string(),
  provider_app_id: z.string(),
  client_key_id: z.string().nullable(),
  accounts: z.string(),
});
type StoredSelection = z.output<typeof StoredSelectionSchema>;

const instant = z.string().transform((value, ctx) => {
  try {
    return Temporal.Instant.from(value);
  } catch {
    ctx.addIssue({ code: 'custom', message: 'not an instant' });
    return z.NEVER;
  }
});

const StoredAccountsSchema = z.object({
  accounts: z.array(
    z.object({
      providerAccountId: z.string().min(1),
      accountKind: z.string(),
      handle: z.string().optional(),
      displayName: z.string(),
      profileUrl: z.string().optional(),
      subjectId: z.string().optional(),
      capabilities: z.record(z.string(), z.unknown()).optional(),
      credentials: z.unknown(),
      grantedScopes: z.array(z.string()),
      accessExpiresAt: instant.optional(),
      refreshExpiresAt: instant.optional(),
    }),
  ),
});

export interface Selection {
  readonly workspaceId: string;
  readonly userId: string;
  readonly provider: string;
  readonly providerAppId: string;
  readonly clientKeyId: string | null;
  readonly accounts: readonly ConnectedAccount<unknown>[];
}

export interface SelectionRequest {
  readonly selectionId: string;
  readonly workspaceId: string;
  readonly userId: string;
  readonly lock?: boolean;
}

function selectionKey(selectionId: string): string {
  return `oauth:pick:${sha256Hex(selectionId)}`;
}

export async function offerSelection(
  deps: Pick<ChannelRouteDeps, 'db' | 'keys'>,
  record: PendingRecord,
  accounts: readonly ConnectedAccount<unknown>[],
): Promise<string> {
  if (accounts.length > MAX_SELECTION_CANDIDATES) throw new ConnectFailure('too_many_accounts');
  const selectionId = newState();
  const key = selectionKey(selectionId);
  const value: StoredSelection = {
    workspace_id: record.workspace_id,
    user_id: record.user_id,
    provider: record.provider,
    provider_app_id: record.provider_app_id,
    client_key_id: record.client_key_id,
    accounts: sealPending(deps.keys.oauthPending, key, { accounts }),
  };
  await deps.db.withActor(SYSTEM, (trx) =>
    trx
      .insertInto('ephemeral_kv')
      .values({
        key,
        value: JSON.stringify(value),
        expires_at: sql<Date>`now() + make_interval(secs => ${SELECTION_TTL_SECONDS})`,
      })
      .execute(),
  );
  return selectionId;
}

function restore(
  secret: Uint8Array,
  key: string,
  stored: StoredSelection,
): readonly ConnectedAccount<unknown>[] | null {
  const opened = openPending(secret, key, stored.accounts);
  const parsed = StoredAccountsSchema.safeParse(opened);
  return parsed.success ? (parsed.data.accounts as readonly ConnectedAccount<unknown>[]) : null;
}

export async function readSelection(
  trx: TenantDb,
  secret: Uint8Array,
  request: SelectionRequest,
): Promise<Selection | null> {
  const key = selectionKey(request.selectionId);
  const query = trx
    .selectFrom('ephemeral_kv')
    .select('value')
    .where('key', '=', key)
    .where('expires_at', '>', sql<Date>`now()`);
  const row = await (request.lock === true ? query.forUpdate() : query).executeTakeFirst();
  const stored = StoredSelectionSchema.safeParse(row?.value);
  if (!stored.success) return null;
  const { data } = stored;
  if (data.workspace_id !== request.workspaceId || data.user_id !== request.userId) return null;
  const accounts = restore(secret, key, data);
  if (accounts === null) return null;
  return {
    workspaceId: data.workspace_id,
    userId: data.user_id,
    provider: data.provider,
    providerAppId: data.provider_app_id,
    clientKeyId: data.client_key_id,
    accounts,
  };
}

export async function dropSelection(trx: TenantDb, selectionId: string): Promise<void> {
  await trx.deleteFrom('ephemeral_kv').where('key', '=', selectionKey(selectionId)).execute();
}
