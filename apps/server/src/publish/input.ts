import { validate } from '@kronaut/compose';
import type {
  PostTypeSpec,
  ProviderApp,
  ProviderState,
  PublishInput,
  PublishItem,
} from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import { loadCredential, loadProviderApp } from '../credentials/credential-store.ts';
import type { ProviderEntry } from '../providers.ts';
import {
  draftItems,
  parseSnapshot,
  publishItems,
  type ResolvedDestination,
  resolveDestination,
} from '../snapshot.ts';
import type { CurrentInput } from './chain.ts';
import type { PublishDeps } from './task.ts';

export interface InputAccount {
  readonly id: string;
  readonly provider_app_id: string;
  readonly provider_account_id: string;
  readonly handle: string | null;
  readonly capabilities?: unknown;
}

export interface InputSource {
  readonly workspaceId: string;
  readonly postId: string;
  readonly frozenPostVersion: number;
  readonly socialAccountId: string;
  readonly publishType: string;
}

export type Prepared =
  | { readonly kind: 'fail'; readonly code: string; readonly message: string | null }
  | { readonly kind: 'no_credential' }
  | {
      readonly kind: 'ready';
      readonly items: readonly PublishItem[];
      readonly postType: PostTypeSpec;
      readonly settings: unknown;
      readonly credential: { readonly id: string; readonly version: number };
      readonly credentials: unknown;
      readonly app: ProviderApp;
    };

export type Ready = Extract<Prepared, { kind: 'ready' }>;

export interface InputParts {
  readonly destinationId: string;
  readonly attemptNo: number;
  readonly publishType: string;
  readonly account: InputAccount;
  readonly ready: Ready;
  readonly current: CurrentInput;
  readonly state: unknown;
}

function providerState(value: unknown): ProviderState {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as ProviderState)
    : {};
}

export async function readResolved(
  trx: TenantDb,
  source: InputSource,
): Promise<ResolvedDestination | undefined> {
  const revision = await trx
    .selectFrom('post_revisions')
    .select('snapshot')
    .where('workspace_id', '=', source.workspaceId)
    .where('post_id', '=', source.postId)
    .where('post_version', '=', source.frozenPostVersion)
    .executeTakeFirst();
  try {
    return resolveDestination(parseSnapshot(revision?.snapshot), {
      socialAccountId: source.socialAccountId,
      publishType: source.publishType,
    });
  } catch {
    return undefined;
  }
}

export async function prepareInput(
  deps: Pick<PublishDeps, 'keyring' | 'publicBaseUrl'>,
  trx: TenantDb,
  options: {
    readonly workspaceId: string;
    readonly publishType: string;
    readonly account: InputAccount;
    readonly entry: ProviderEntry;
    readonly resolved: ResolvedDestination;
    readonly acked: ReadonlySet<string> | null;
  },
): Promise<Prepared> {
  const { account, entry, resolved } = options;
  const fail = (code: string, message: string | null = null): Prepared => ({
    kind: 'fail',
    code,
    message,
  });
  const items = publishItems(resolved);
  const { acked } = options;
  if (acked !== null) {
    const issue = validate(
      entry.manifest,
      options.publishType,
      draftItems(resolved),
      account.capabilities,
    ).find((candidate) => !acked.has(candidate.code));
    if (issue !== undefined) return fail('preflight_invalid', issue.code);
  }
  const postType = entry.manifest.postTypes.find((spec) => spec.id === options.publishType);
  if (postType === undefined) return fail('preflight_invalid', 'unknown_post_type');
  const settings = entry.manifest.settings.safeParse(resolved.destination.settings);
  if (!settings.success) return fail('preflight_invalid', 'settings_invalid');

  const credential = await loadCredential(trx, deps.keyring, {
    workspaceId: options.workspaceId,
    socialAccountId: account.id,
    kind: entry.manifest.auth.kind,
  });
  if (credential === null) return { kind: 'no_credential' };
  const app = await loadProviderApp(
    trx,
    deps.keyring,
    { id: account.provider_app_id },
    { publicBaseUrl: deps.publicBaseUrl },
  );
  if (app === null) throw new Error('social account has no provider app');
  return {
    kind: 'ready',
    items,
    postType,
    settings: settings.data,
    credential: { id: credential.id, version: credential.version },
    credentials: entry.runtime.parseCredentials(credential.value),
    app: app.app,
  };
}

export function publishInput(parts: InputParts): PublishInput<unknown, unknown> {
  const { account, ready, current } = parts;
  return {
    destinationId: parts.destinationId,
    attemptNo: parts.attemptNo,
    postType: parts.publishType,
    account: {
      providerAccountId: account.provider_account_id,
      ...(account.handle === null ? {} : { handle: account.handle }),
    },
    credentials: ready.credentials,
    app: ready.app,
    settings: ready.settings,
    items: [current.item],
    ...(current.chain.length === 0 ? {} : { chain: current.chain }),
    state: providerState(parts.state),
  };
}
