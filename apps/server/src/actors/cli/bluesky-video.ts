import { encodePublicId } from '@kronaut/core';
import { CredentialError, type Keyring } from '@kronaut/credentials';
import type { Actor, Database, TenantDb } from '@kronaut/db';
import { displayHandle, type VideoCheckReport } from '@kronaut/providers/bluesky/video-check';
import { sql } from 'kysely';
import { Temporal } from 'temporal-polyfill';
import { loadCredential } from '../../infrastructure/credentials/credential-store.ts';

const CLI: Actor = { kind: 'cli' };
const BLUESKY = 'bluesky';
const WORKSPACE_PAGE = 100;
const EXPIRY_MARGIN_MS = 60_000;

export type ChannelCredential =
  | { readonly kind: 'missing' }
  | { readonly kind: 'unreadable' }
  | { readonly kind: 'stored'; readonly value: unknown; readonly accessExpiresAt: Date | null };

export interface BlueskyChannel {
  readonly id: string;
  readonly handle: string | null;
  readonly did: string;
  readonly credential: ChannelCredential;
}

export interface FindDeps {
  readonly db: Database;
  readonly keyring: Keyring;
}

export type ChannelCheck =
  | { readonly kind: 'no_credential' }
  | { readonly kind: 'unreadable' }
  | { readonly kind: 'expired' }
  | { readonly kind: 'checked'; readonly report: VideoCheckReport };

export interface CheckedChannel {
  readonly id: string;
  readonly name: string;
  readonly check: ChannelCheck;
}

export type VideoChecker = (credentials: unknown) => Promise<VideoCheckReport>;

async function workspaceIds(db: Database): Promise<string[]> {
  const ids: string[] = [];
  let after: string | null = null;
  for (;;) {
    const page = await db.sweeps.workspaces(after, WORKSPACE_PAGE);
    ids.push(...page);
    const last = page.at(-1);
    if (page.length < WORKSPACE_PAGE || last === undefined) return ids;
    after = last;
  }
}

async function credentialOf(
  trx: TenantDb,
  keyring: Keyring,
  ref: { readonly workspaceId: string; readonly socialAccountId: string },
): Promise<ChannelCredential> {
  try {
    const stored = await loadCredential(trx, keyring, { ...ref, kind: 'oauth' });
    if (stored === null) return { kind: 'missing' };
    return { kind: 'stored', value: stored.value, accessExpiresAt: stored.accessExpiresAt };
  } catch (err) {
    if (err instanceof CredentialError) return { kind: 'unreadable' };
    throw err;
  }
}

function wanted(filter: string | undefined): string | undefined {
  return filter?.trim().replace(/^@/, '').toLowerCase();
}

async function channelsIn(
  trx: TenantDb,
  keyring: Keyring,
  workspaceId: string,
  filter: string | undefined,
): Promise<BlueskyChannel[]> {
  let query = trx
    .selectFrom('social_accounts')
    .select(['id', 'handle', 'provider_account_id'])
    .where('workspace_id', '=', workspaceId)
    .where('provider', '=', BLUESKY)
    .where('status', '=', 'active');
  if (filter !== undefined) {
    query = query.where((eb) =>
      eb.or([eb('provider_account_id', '=', filter), eb(sql<string>`lower(handle)`, '=', filter)]),
    );
  }
  const channels: BlueskyChannel[] = [];
  for (const account of await query.orderBy('created_at').execute()) {
    channels.push({
      id: encodePublicId('socialAccount', account.id),
      handle: account.handle,
      did: account.provider_account_id,
      credential: await credentialOf(trx, keyring, { workspaceId, socialAccountId: account.id }),
    });
  }
  return channels;
}

export async function findBlueskyChannels(
  deps: FindDeps,
  filter?: string,
): Promise<BlueskyChannel[]> {
  const match = wanted(filter);
  const found: BlueskyChannel[] = [];
  for (const workspaceId of await workspaceIds(deps.db)) {
    const channels = await deps.db.withTenant(workspaceId, CLI, (trx) =>
      channelsIn(trx, deps.keyring, workspaceId, match),
    );
    found.push(...channels);
  }
  return found;
}

function expired(at: Date | null, now: Temporal.Instant): boolean {
  if (at === null) return false;
  const deadline = now.add({ milliseconds: EXPIRY_MARGIN_MS });
  return (
    Temporal.Instant.compare(Temporal.Instant.fromEpochMilliseconds(at.getTime()), deadline) <= 0
  );
}

async function checkOne(
  { credential }: BlueskyChannel,
  check: VideoChecker,
  now: Temporal.Instant,
): Promise<ChannelCheck> {
  if (credential.kind === 'missing') return { kind: 'no_credential' };
  if (credential.kind === 'unreadable') return { kind: 'unreadable' };
  if (expired(credential.accessExpiresAt, now)) return { kind: 'expired' };
  try {
    return { kind: 'checked', report: await check(credential.value) };
  } catch {
    return { kind: 'unreadable' };
  }
}

export async function checkBlueskyChannels(
  channels: readonly BlueskyChannel[],
  check: VideoChecker,
  now: () => Temporal.Instant,
): Promise<CheckedChannel[]> {
  const checked: CheckedChannel[] = [];
  for (const channel of channels) {
    checked.push({
      id: channel.id,
      name: displayHandle(channel.handle) ?? channel.did,
      check: await checkOne(channel, check, now()),
    });
  }
  return checked;
}
