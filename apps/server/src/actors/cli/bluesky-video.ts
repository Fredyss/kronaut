import { encodePublicId } from '@kronaut/core';
import type { Keyring } from '@kronaut/credentials';
import type { Actor, Database, TenantDb } from '@kronaut/db';
import type { VideoCheckReport } from '@kronaut/providers/bluesky/video-check';
import { Temporal } from 'temporal-polyfill';
import { loadCredential } from '../../infrastructure/credentials/credential-store.ts';

const CLI: Actor = { kind: 'cli' };
const BLUESKY = 'bluesky';
const WORKSPACE_PAGE = 100;
const EXPIRY_MARGIN_MS = 60_000;

export interface BlueskyChannel {
  readonly id: string;
  readonly handle: string | null;
  readonly did: string;
  readonly credentials: unknown;
  readonly accessExpiresAt: Date | null;
}

export interface FindDeps {
  readonly db: Database;
  readonly keyring: Keyring;
}

export type ChannelCheck =
  | { readonly kind: 'no_credential' }
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

async function channelsIn(
  trx: TenantDb,
  keyring: Keyring,
  workspaceId: string,
): Promise<BlueskyChannel[]> {
  const accounts = await trx
    .selectFrom('social_accounts')
    .select(['id', 'handle', 'provider_account_id'])
    .where('workspace_id', '=', workspaceId)
    .where('provider', '=', BLUESKY)
    .where('status', '=', 'active')
    .orderBy('created_at')
    .execute();
  const channels: BlueskyChannel[] = [];
  for (const account of accounts) {
    const credential = await loadCredential(trx, keyring, {
      workspaceId,
      socialAccountId: account.id,
      kind: 'oauth',
    });
    channels.push({
      id: encodePublicId('socialAccount', account.id),
      handle: account.handle,
      did: account.provider_account_id,
      credentials: credential?.value ?? null,
      accessExpiresAt: credential?.accessExpiresAt ?? null,
    });
  }
  return channels;
}

function matches(channel: BlueskyChannel, filter: string): boolean {
  const wanted = filter.trim().replace(/^@/, '').toLowerCase();
  return channel.did === wanted || channel.handle?.toLowerCase() === wanted;
}

export async function findBlueskyChannels(
  deps: FindDeps,
  filter?: string,
): Promise<BlueskyChannel[]> {
  const found: BlueskyChannel[] = [];
  for (const workspaceId of await workspaceIds(deps.db)) {
    const channels = await deps.db.withTenant(workspaceId, CLI, (trx) =>
      channelsIn(trx, deps.keyring, workspaceId),
    );
    found.push(...channels);
  }
  return filter === undefined ? found : found.filter((channel) => matches(channel, filter));
}

function expired(at: Date | null, now: Temporal.Instant): boolean {
  if (at === null) return false;
  const deadline = now.add({ milliseconds: EXPIRY_MARGIN_MS });
  return (
    Temporal.Instant.compare(Temporal.Instant.fromEpochMilliseconds(at.getTime()), deadline) <= 0
  );
}

async function checkOne(
  channel: BlueskyChannel,
  check: VideoChecker,
  now: Temporal.Instant,
): Promise<ChannelCheck> {
  if (channel.credentials === null) return { kind: 'no_credential' };
  if (expired(channel.accessExpiresAt, now)) return { kind: 'expired' };
  return { kind: 'checked', report: await check(channel.credentials) };
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
      name: channel.handle ?? channel.did,
      check: await checkOne(channel, check, now()),
    });
  }
  return checked;
}
