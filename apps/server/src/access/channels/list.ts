import { defineRoute } from '@kronaut/contract';
import { type AccessScope, encodePublicId, PREVIEW_ARCHETYPES } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import * as z from 'zod';
import {
  CostSchema,
  PostTypeRulesSchema,
  providerRules,
} from '../../base/providers/channel-rules.ts';
import type { ProviderEntry, ProviderRegistry } from '../../base/providers/providers.ts';
import { loadCredentialExpiries, shownExpiry } from './expiry.ts';
import { loadChannelGroups } from './groups.ts';
import { loadSignatures, SignatureSchema } from './signature-read.ts';

const Instant = z.iso.datetime();

const CHANNEL_STATUSES = ['active', 'needs_reauth', 'disabled', 'disconnected'] as const;
const AVAILABILITY = ['stable', 'experimental', 'limited'] as const;
const ChannelSchema = z.object({
  id: z.string(),
  provider: z.string(),
  accountKind: z.string(),
  handle: z.string().nullable(),
  displayName: z.string(),
  profileUrl: z.string().nullable(),
  status: z.enum(CHANNEL_STATUSES),
  statusReason: z.string().nullable(),
  accessExpiresAt: Instant.nullable(),
  connectedAt: Instant,
  dataRetentionDays: z.number().int().nullable(),
  lastErrorCode: z.string().nullable(),
  postTypes: z.array(PostTypeRulesSchema),
  requiredSettings: z.array(z.string()),
  settingOptions: z.record(z.string(), z.array(z.object({ value: z.string(), label: z.string() }))),
  preview: z.enum(PREVIEW_ARCHETYPES),
  manualOnly: z.boolean(),
  noRepeats: z.boolean(),
  warnDuplicateText: z.boolean(),
  cost: CostSchema.nullable(),
  insights: z.boolean(),
  signature: SignatureSchema.nullable(),
  shortenLinks: z.boolean(),
  brandId: z.string().nullable(),
  groupIds: z.array(z.string()),
});

export const channelListRoute = defineRoute({
  id: 'channels.list',
  method: 'GET',
  path: '/v1/workspaces/:workspaceId/channels',
  auth: ['session', 'grant'],
  action: 'channels:read',
  params: z.object({ workspaceId: z.string() }),
  response: z.object({ items: z.array(ChannelSchema) }),
  summary: 'List the connected channels',
  description:
    'A key without posts:read gets signature: null on every channel, and a key without groups:read gets groupIds: [].',
  tags: ['channels'],
});

export const channelProvidersRoute = defineRoute({
  id: 'channels.providers',
  method: 'GET',
  path: '/v1/workspaces/:workspaceId/channels/providers',
  auth: 'session',
  action: 'channels:connect',
  params: z.object({ workspaceId: z.string() }),
  response: z.object({
    items: z.array(z.object({ id: z.string(), availability: z.enum(AVAILABILITY) })),
  }),
  summary: 'List the providers this server can connect',
  tags: ['channels'],
});

const insightsCapability = z.looseObject({ insights: z.literal(true) });

function insightsGranted(capabilities: unknown): boolean {
  return insightsCapability.safeParse(capabilities).success;
}

interface ChannelListOptions {
  readonly scope: AccessScope | null;
  readonly hideSignatures: boolean;
  readonly hideGroups: boolean;
}

function channelRows(trx: TenantDb, workspaceId: string, scope: AccessScope | null) {
  let query = trx
    .selectFrom('social_accounts')
    .select([
      'id',
      'provider',
      'account_kind',
      'handle',
      'display_name',
      'profile_url',
      'status',
      'status_reason',
      'created_at',
      'last_error_code',
      'capabilities',
      'saved_text_id',
      'shorten_links',
      'brand_id',
    ])
    .where('workspace_id', '=', workspaceId);
  if (scope !== null) {
    query = query.where((eb) =>
      eb.or([
        ...(scope.socialAccountIds.length === 0 ? [] : [eb('id', 'in', scope.socialAccountIds)]),
        ...(scope.brandIds.length === 0 ? [] : [eb('brand_id', 'in', scope.brandIds)]),
        ...(scope.locationIds.length === 0 ? [] : [eb('location_id', 'in', scope.locationIds)]),
      ]),
    );
  }
  return query.orderBy('created_at').orderBy('id').execute();
}

export async function listChannels(
  trx: TenantDb,
  workspaceId: string,
  providers: ProviderRegistry,
  { scope, hideSignatures, hideGroups }: ChannelListOptions,
): Promise<z.output<typeof ChannelSchema>[]> {
  const rows = await channelRows(trx, workspaceId, scope);
  const expiries = await loadCredentialExpiries(
    trx,
    workspaceId,
    rows.map((row) => row.id),
  );
  const groupsOf = await loadChannelGroups(
    trx,
    workspaceId,
    hideGroups ? [] : rows.map((row) => row.id),
  );
  const signatures = await loadSignatures(
    trx,
    workspaceId,
    hideSignatures ? [] : rows.flatMap((row) => row.saved_text_id ?? []),
  );
  return rows.map((row) => {
    const entry = providers.get(row.provider);
    return ChannelSchema.parse({
      id: encodePublicId('socialAccount', row.id),
      provider: row.provider,
      accountKind: row.account_kind,
      handle: row.handle,
      displayName: row.display_name,
      profileUrl: row.profile_url,
      status: row.status,
      statusReason: row.status_reason,
      accessExpiresAt: shownExpiry(entry, expiries.get(row.id)),
      connectedAt: row.created_at.toISOString(),
      dataRetentionDays: entry?.manifest.dataRetention?.disconnectedDays ?? null,
      lastErrorCode: row.last_error_code,
      ...providerRules(entry, row.capabilities),
      insights: insightsGranted(row.capabilities),
      signature: signatures.get(row.saved_text_id ?? '') ?? null,
      shortenLinks: row.shorten_links,
      brandId: row.brand_id === null ? null : encodePublicId('brand', row.brand_id),
      groupIds: groupsOf.get(row.id) ?? [],
    });
  });
}

function registersOnDemand({ manifest, runtime }: ProviderEntry): boolean {
  return manifest.auth.instanceScoped === true && runtime.registerApp !== undefined;
}

export async function readyProviders(
  trx: TenantDb,
  providers: ProviderRegistry,
): Promise<ReadonlySet<string>> {
  const rows = await trx
    .selectFrom('provider_apps as p')
    .select((eb) => {
      const keys = () =>
        eb
          .selectFrom('provider_app_keys as k')
          .select('k.id')
          .whereRef('k.provider_app_id', '=', 'p.id');
      return [
        'p.provider',
        eb
          .or([eb.not(eb.exists(keys())), eb.exists(keys().where('k.status', '=', 'active'))])
          .as('ready'),
      ];
    })
    .where('p.status', '=', 'active')
    .where('p.instance_host', '=', '')
    .execute();
  const apps = new Map<string, number>();
  for (const row of rows) apps.set(row.provider, (apps.get(row.provider) ?? 0) + 1);
  return new Set([
    ...rows.filter((row) => row.ready && apps.get(row.provider) === 1).map((row) => row.provider),
    ...providers
      .list()
      .filter(registersOnDemand)
      .map(({ manifest }) => manifest.id),
  ]);
}
