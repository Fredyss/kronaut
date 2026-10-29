import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from 'node:crypto';
import type { ConnectedAccount, CredentialKind, ProviderState } from '@kronaut/core';
import type { Keyring } from '@kronaut/credentials';
import type { Actor, Database, TenantDb } from '@kronaut/db';
import { sql } from 'kysely';
import { Temporal } from 'temporal-polyfill';
import * as z from 'zod';
import { saveCredential } from '../credential-store.ts';
import { channelReconnectedEvent, writeWebhookEvent } from '../webhooks/events.ts';

export const STATE_TTL_SECONDS = 600;

const SYSTEM: Actor = { kind: 'system' };
const STATE_BYTES = 32;
const NONCE_BYTES = 12;
const TAG_BYTES = 16;
const CIPHER = 'aes-256-gcm';

const PendingRecordSchema = z.object({
  workspace_id: z.string(),
  user_id: z.string(),
  session_hash: z.string(),
  provider: z.string(),
  provider_app_id: z.string(),
  client_key_id: z.string().nullable().default(null),
  pending: z.string(),
});
export type PendingRecord = z.output<typeof PendingRecordSchema>;

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

export function newState(): string {
  return randomBytes(STATE_BYTES).toString('base64url');
}

export function stateKey(state: string): string {
  return `oauth:${sha256Hex(state)}`;
}

export function sealPending(key: Uint8Array, kvKey: string, pending: ProviderState): string {
  const nonce = randomBytes(NONCE_BYTES);
  const cipher = createCipheriv(CIPHER, key, nonce, { authTagLength: TAG_BYTES });
  cipher.setAAD(Buffer.from(kvKey, 'utf8'));
  const plaintext = Buffer.from(JSON.stringify(pending), 'utf8');
  try {
    const body = Buffer.concat([cipher.update(plaintext), cipher.final(), cipher.getAuthTag()]);
    return Buffer.concat([nonce, body]).toString('base64url');
  } finally {
    plaintext.fill(0);
  }
}

function isState(value: unknown): value is ProviderState {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function openPending(key: Uint8Array, kvKey: string, sealed: string): ProviderState | null {
  const raw = Buffer.from(sealed, 'base64url');
  if (raw.length < NONCE_BYTES + TAG_BYTES) return null;
  const nonce = raw.subarray(0, NONCE_BYTES);
  const body = raw.subarray(NONCE_BYTES, raw.length - TAG_BYTES);
  const tag = raw.subarray(raw.length - TAG_BYTES);
  let plaintext: Buffer;
  try {
    const decipher = createDecipheriv(CIPHER, key, nonce, { authTagLength: TAG_BYTES });
    decipher.setAAD(Buffer.from(kvKey, 'utf8'));
    decipher.setAuthTag(tag);
    plaintext = Buffer.concat([decipher.update(body), decipher.final()]);
  } catch {
    return null;
  }
  try {
    const value: unknown = JSON.parse(plaintext.toString('utf8'));
    return isState(value) ? value : null;
  } catch {
    return null;
  } finally {
    plaintext.fill(0);
  }
}

export async function selectAppId(trx: TenantDb, provider: string): Promise<string | null> {
  const rows = await trx
    .selectFrom('provider_apps')
    .select('id')
    .where('provider', '=', provider)
    .where('status', '=', 'active')
    .where('instance_host', '=', '')
    .limit(2)
    .execute();
  const [only] = rows;
  return rows.length === 1 && only !== undefined ? only.id : null;
}

export async function storePending(
  trx: TenantDb,
  kvKey: string,
  record: PendingRecord,
): Promise<void> {
  await trx
    .insertInto('ephemeral_kv')
    .values({
      key: kvKey,
      value: JSON.stringify(record),
      expires_at: sql<Date>`now() + make_interval(secs => ${STATE_TTL_SECONDS})`,
    })
    .execute();
}

export async function consumePending(db: Database, kvKey: string): Promise<PendingRecord | null> {
  const row = await db.withActor(SYSTEM, (trx) =>
    trx
      .deleteFrom('ephemeral_kv')
      .where('key', '=', kvKey)
      .where('expires_at', '>', sql<Date>`now()`)
      .returning('value')
      .executeTakeFirst(),
  );
  if (row === undefined) return null;
  const parsed = PendingRecordSchema.safeParse(row.value);
  return parsed.success ? parsed.data : null;
}

export interface Connection {
  readonly workspaceId: string;
  readonly userId: string;
  readonly provider: string;
  readonly providerAppId: string;
  readonly clientKeyId: string | null;
  readonly credentialKind: CredentialKind;
  readonly account: ConnectedAccount<unknown>;
  readonly requestId: string;
}

function toDate(instant: Temporal.Instant | undefined): Date | null {
  return instant === undefined ? null : new Date(instant.epochMilliseconds);
}

function nfc(value: string | undefined): string | null {
  return value === undefined ? null : value.normalize('NFC');
}

interface Existing {
  readonly id: string;
  readonly status: string;
}

async function findAccount(trx: TenantDb, input: Connection): Promise<Existing | undefined> {
  return await trx
    .selectFrom('social_accounts')
    .select(['id', 'status'])
    .where('workspace_id', '=', input.workspaceId)
    .where('provider', '=', input.provider)
    .where('provider_account_id', '=', input.account.providerAccountId)
    .forUpdate()
    .executeTakeFirst();
}

async function upsertAccount(
  trx: TenantDb,
  input: Connection,
): Promise<{ id: string; previous: string | null; changedAt: Date }> {
  const { account } = input;
  const fields = {
    handle: nfc(account.handle),
    display_name: account.displayName.normalize('NFC'),
    profile_url: account.profileUrl ?? null,
    provider_subject_id: account.subjectId ?? null,
    account_kind: account.accountKind,
    provider_app_id: input.providerAppId,
    access_expires_at: toDate(account.accessExpiresAt),
    refresh_expires_at: toDate(account.refreshExpiresAt),
    ...(account.capabilities === undefined
      ? {}
      : { capabilities: JSON.stringify(account.capabilities) }),
  };
  let existing = await findAccount(trx, input);
  if (existing === undefined) {
    const inserted = await trx
      .insertInto('social_accounts')
      .values({
        workspace_id: input.workspaceId,
        provider: input.provider,
        provider_account_id: account.providerAccountId,
        ...fields,
      })
      .onConflict((oc) =>
        oc.columns(['workspace_id', 'provider', 'provider_account_id']).doNothing(),
      )
      .returning(['id', 'status_changed_at'])
      .executeTakeFirst();
    if (inserted !== undefined) {
      return { id: inserted.id, previous: null, changedAt: inserted.status_changed_at };
    }
    existing = await findAccount(trx, input);
    if (existing === undefined) throw new Error('social account vanished during connect');
  }
  const changed = existing.status !== 'active';
  const updated = await trx
    .updateTable('social_accounts')
    .set({
      ...fields,
      status: 'active',
      status_reason: null,
      ...(changed ? { status_changed_at: sql<Date>`now()` } : {}),
    })
    .where('workspace_id', '=', input.workspaceId)
    .where('id', '=', existing.id)
    .returning(['id', 'status_changed_at'])
    .executeTakeFirstOrThrow();
  return { id: updated.id, previous: existing.status, changedAt: updated.status_changed_at };
}

const CREDENTIAL_INCIDENTS = [
  'auth_revoked',
  'auth_expiring',
  'auth_expired',
  'refresh_token_lost',
];

export async function persistConnection(
  trx: TenantDb,
  keyring: Keyring,
  input: Connection,
): Promise<string> {
  const { workspaceId, account } = input;
  const { id, previous, changedAt } = await upsertAccount(trx, input);
  await saveCredential(trx, keyring, {
    workspaceId,
    socialAccountId: id,
    kind: input.credentialKind,
    value: account.credentials,
    grantedScopes: account.grantedScopes,
    accessExpiresAt: account.accessExpiresAt,
    refreshExpiresAt: account.refreshExpiresAt,
    clientKeyId: input.clientKeyId,
  });
  if (previous !== null) {
    await trx
      .updateTable('channel_incidents')
      .set({ resolved_at: sql<Date>`now()` })
      .where('workspace_id', '=', workspaceId)
      .where('social_account_id', '=', id)
      .where('kind', 'in', CREDENTIAL_INCIDENTS)
      .where('resolved_at', 'is', null)
      .execute();
  }
  await trx
    .insertInto('audit_events')
    .values({
      workspace_id: workspaceId,
      actor_kind: 'user',
      actor_id: input.userId,
      surface: 'ui',
      action: previous === null ? 'channel.connected' : 'channel.reconnected',
      resource_kind: 'social_account',
      resource_id: id,
      social_account_ids: [id],
      outcome: 'ok',
      correlation_id: randomUUID(),
      request_id: input.requestId,
    })
    .execute();
  if (previous === 'needs_reauth') {
    await writeWebhookEvent(
      trx,
      channelReconnectedEvent(
        workspaceId,
        Temporal.Instant.fromEpochMilliseconds(changedAt.getTime()),
        {
          social_account_id: id,
          provider: input.provider,
        },
      ),
    );
  }
  return id;
}
