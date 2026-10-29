import { accountPostType } from '@kronaut/compose';
import { defineRoute } from '@kronaut/contract';
import {
  type AccessScope,
  encodePublicId,
  type ImageLimits,
  PREVIEW_ARCHETYPES,
  type TextCounting,
  type VideoLimits,
} from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import * as z from 'zod';
import type { ProviderEntry, ProviderRegistry } from '../providers.ts';

const Instant = z.iso.datetime();

export const CHANNEL_STATUSES = ['active', 'needs_reauth', 'disabled', 'disconnected'] as const;
const AVAILABILITY = ['stable', 'experimental', 'limited'] as const;
const TEXT_COUNTINGS = [
  'x-weighted',
  'mastodon',
  'threads',
  'graphemes',
  'utf16',
  'utf8-bytes',
] as const satisfies readonly TextCounting[];

const RatioSchema = z.object({ width: z.number().int(), height: z.number().int() });

const TextLimitSchema = z.object({
  counting: z.enum(TEXT_COUNTINGS),
  max: z.number().int(),
  urlWeight: z.number().int().optional(),
});

const PostTypeRulesSchema = z.object({
  id: z.string(),
  text: z.array(TextLimitSchema),
  maxLinks: z.number().int().nullable(),
  imageAspect: z.object({ min: RatioSchema, max: RatioSchema }).nullable(),
  video: z
    .object({
      mimes: z.array(z.string()),
      maxBytes: z.number().int(),
      minDurationMs: z.number().int(),
      maxDurationMs: z.number().int(),
      aspect: z.object({ min: RatioSchema, max: RatioSchema }).nullable(),
      maxFrameRate: z.number().nullable(),
      maxPixels: z.number().int().nullable(),
    })
    .nullable(),
  thread: z.object({ maxItems: z.number().int() }).nullable(),
  comment: z.object({ text: z.array(TextLimitSchema) }).nullable(),
});

export const ChannelSchema = z.object({
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
  lastErrorCode: z.string().nullable(),
  postTypes: z.array(PostTypeRulesSchema),
  preview: z.enum(PREVIEW_ARCHETYPES),
  insights: z.boolean(),
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

function iso(value: Date | null): string | null {
  return value === null ? null : value.toISOString();
}

function imageAspect(image: ImageLimits | undefined) {
  if (image?.minAspect === undefined || image.maxAspect === undefined) return null;
  return { min: { ...image.minAspect }, max: { ...image.maxAspect } };
}

function videoRules(video: VideoLimits | undefined) {
  if (video === undefined) return null;
  const aspect =
    video.minAspect === undefined || video.maxAspect === undefined
      ? null
      : { min: { ...video.minAspect }, max: { ...video.maxAspect } };
  const { mimes, maxBytes, minDurationMs, maxDurationMs } = video;
  return {
    mimes: [...mimes],
    maxBytes,
    minDurationMs,
    maxDurationMs,
    aspect,
    maxFrameRate: video.maxFrameRate ?? null,
    maxPixels: video.maxPixels ?? null,
  };
}

function postTypes(
  entry: ProviderEntry | undefined,
  capabilities: unknown,
): z.input<typeof PostTypeRulesSchema>[] {
  if (entry === undefined) return [];
  const { manifest } = entry;
  return manifest.postTypes.flatMap(({ id }) => {
    const postType = accountPostType(manifest, id, capabilities);
    if (postType === undefined || postType.delivery === 'unsupported') return [];
    return [
      {
        id,
        text: [...postType.text],
        maxLinks: postType.maxLinks ?? null,
        imageAspect: imageAspect(postType.media.image),
        video: videoRules(postType.media.video),
        thread: postType.thread === undefined ? null : { maxItems: postType.thread.maxItems },
        comment: postType.comment === undefined ? null : { text: [...postType.comment.text] },
      },
    ];
  });
}

const insightsCapability = z.looseObject({ insights: z.literal(true) });

function insightsGranted(capabilities: unknown): boolean {
  return insightsCapability.safeParse(capabilities).success;
}

export async function listChannels(
  trx: TenantDb,
  workspaceId: string,
  scope: AccessScope | null,
  providers: ProviderRegistry,
): Promise<z.output<typeof ChannelSchema>[]> {
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
      'access_expires_at',
      'created_at',
      'last_error_code',
      'capabilities',
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
  const rows = await query.orderBy('created_at').orderBy('id').execute();
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
      accessExpiresAt: iso(row.access_expires_at),
      connectedAt: row.created_at.toISOString(),
      lastErrorCode: row.last_error_code,
      postTypes: postTypes(entry, row.capabilities),
      preview: entry?.manifest.preview ?? 'short-feed',
      insights: insightsGranted(row.capabilities),
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
