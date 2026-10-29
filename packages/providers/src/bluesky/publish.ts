import {
  type MediaRef,
  type ProviderError,
  ProviderFailure,
  type PublishContext,
  type PublishOutcome,
  type StepEffect,
} from '@kronaut/core';
import { Temporal } from 'temporal-polyfill';
import * as z from 'zod';
import { unexpectedResponse } from '../_kit/failure.ts';
import { retryAfter } from '../_kit/http.ts';
import { errorCode, type ResourceClient, type ResourceReply, resourceClient } from './dpop.ts';
import { buildFacets, type Facet, facetSchema } from './facets.ts';
import { permanent } from './identity.ts';
import {
  type CheckedItem,
  checkItem,
  type Input,
  POST_COLLECTION,
  postUrl,
  spec,
} from './publish-input.ts';
import { TID_PATTERN, tid } from './tid.ts';

const XRPC_ERROR = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;
const RATE_LIMIT_FALLBACK_MS = 60_000;

const blobRef = z.object({
  $type: z.literal('blob'),
  ref: z.object({ $link: z.string().min(1) }),
  mimeType: z.string().min(1),
  size: z.number().int().nonnegative(),
});
type BlobRef = z.infer<typeof blobRef>;

export const publishState = z.object({
  rkey: z.string().regex(TID_PATTERN).optional(),
  createdAt: z.string().min(1).optional(),
  facets: z.array(facetSchema).optional(),
  blobs: z.record(z.string(), blobRef).optional(),
});

const uploadResponse = z.looseObject({ blob: blobRef });
const createResponse = z.looseObject({
  uri: z.string().startsWith('at://'),
  cid: z.string().min(1),
});

type Frozen = {
  readonly rkey: string;
  readonly createdAt: string;
  readonly facets?: readonly Facet[];
  readonly blobs: Readonly<Record<string, BlobRef>>;
};

function isoMillis(now: Temporal.Instant): string {
  return now.toString({ smallestUnit: 'millisecond' });
}

function parseState(state: unknown): z.infer<typeof publishState> {
  const parsed = publishState.safeParse(state);
  if (!parsed.success) throw permanent('state_invalid');
  return parsed.data;
}

function rateLimitScope(policy: string | null): 'account' | 'instance' {
  return policy !== null && /;\s*w=300\b/.test(policy) ? 'instance' : 'account';
}

export function resetAt(headers: Headers, now: Temporal.Instant): Temporal.Instant {
  const reset = headers.get('ratelimit-reset')?.trim();
  if (reset !== undefined && /^\d{1,12}$/.test(reset))
    return Temporal.Instant.fromEpochMilliseconds(Number(reset) * 1000);
  return retryAfter(headers, now, RATE_LIMIT_FALLBACK_MS);
}

function failureOf(reply: ResourceReply, effect: StepEffect, now: Temporal.Instant): ProviderError {
  const { status, headers } = reply.response;
  const raw = errorCode(reply.body);
  if (status === 429)
    return {
      kind: 'rate_limited',
      scope: rateLimitScope(headers.get('ratelimit-policy')),
      resetAt: resetAt(headers, now),
    };
  if (status === 401)
    return raw === 'use_dpop_nonce'
      ? { kind: 'transient', detail: 'dpop_nonce_rejected' }
      : { kind: 'auth_expired' };
  if (status >= 400 && status < 500)
    return {
      kind: 'permanent',
      code: raw !== undefined && XRPC_ERROR.test(raw) ? raw : `http_${status}`,
    };
  if (effect === 'public') return { kind: 'ambiguous', detail: `http_${status}` };
  return { kind: 'transient', detail: `http_${status}` };
}

function successBody<T>(
  reply: ResourceReply,
  schema: z.ZodType<T>,
  effect: StepEffect,
  now: Temporal.Instant,
): T {
  if (reply.response.status !== 200) throw new ProviderFailure(failureOf(reply, effect, now));
  if (!reply.response.headers.has('dpop-nonce')) throw unexpectedResponse(effect);
  const parsed = schema.safeParse(reply.body);
  if (!parsed.success) throw unexpectedResponse(effect, parsed.error);
  return parsed.data;
}

async function freeze(ctx: PublishContext, state: unknown): Promise<Frozen> {
  const { rkey, createdAt, facets, blobs = {} } = parseState(state);
  const rest = { blobs, ...(facets === undefined ? {} : { facets }) };
  if (rkey !== undefined && createdAt !== undefined) return { rkey, createdAt, ...rest };
  if (rkey !== undefined || createdAt !== undefined) throw permanent('state_invalid');
  const now = ctx.now();
  const frozen: Frozen = { rkey: tid(now), createdAt: isoMillis(now), ...rest };
  await ctx.checkpoint(frozen);
  return frozen;
}

async function uploadBlob(
  ctx: PublishContext,
  pds: ResourceClient,
  origin: string,
  ref: MediaRef,
): Promise<BlobRef> {
  const bytes = await ctx.media.read(ref.id);
  if (bytes.byteLength > spec.image.maxBytes) throw permanent('image_too_large');
  const reply = await pds('private', {
    method: 'POST',
    url: `${origin}/xrpc/com.atproto.repo.uploadBlob`,
    contentType: ref.mime,
    body: bytes,
  });
  return successBody(reply, uploadResponse, 'private', ctx.now()).blob;
}

function aspectRatio(
  ref: MediaRef,
): { readonly width: number; readonly height: number } | undefined {
  const { width, height } = ref;
  if (width === undefined || height === undefined) return undefined;
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1)
    return undefined;
  return { width, height };
}

function postRecord({ item, reply }: CheckedItem, frozen: Frozen): Record<string, unknown> {
  const images = item.media.map((ref) => {
    const image = frozen.blobs[ref.id];
    if (image === undefined) throw new Error('blob missing after upload');
    const ratio = aspectRatio(ref);
    return {
      alt: ref.altText ?? '',
      image,
      ...(ratio === undefined ? {} : { aspectRatio: ratio }),
    };
  });
  return {
    $type: POST_COLLECTION,
    text: item.text,
    createdAt: frozen.createdAt,
    ...(frozen.facets === undefined || frozen.facets.length === 0 ? {} : { facets: frozen.facets }),
    ...(images.length === 0 ? {} : { embed: { $type: 'app.bsky.embed.images', images } }),
    ...(reply === undefined ? {} : { reply }),
  };
}

export async function publishPost(ctx: PublishContext, input: Input): Promise<PublishOutcome> {
  const checked = checkItem(input);
  const { item } = checked;
  const { credentials } = input;
  let frozen = await freeze(ctx, input.state);
  const pds = resourceClient(ctx, {
    accessToken: credentials.accessToken,
    dpopJwk: credentials.dpopJwk,
    ...(credentials.pdsNonce === undefined ? {} : { nonce: credentials.pdsNonce }),
  });

  await ctx.step('upload_blobs');
  if (frozen.facets === undefined) {
    frozen = { ...frozen, facets: await buildFacets(ctx, item.text) };
    await ctx.checkpoint(frozen);
  }
  for (const ref of item.media) {
    if (frozen.blobs[ref.id] !== undefined) continue;
    const blob = await uploadBlob(ctx, pds, credentials.pds, ref);
    frozen = { ...frozen, blobs: { ...frozen.blobs, [ref.id]: blob } };
    await ctx.checkpoint(frozen);
  }

  await ctx.step('create_record');
  const reply = await pds('public', {
    method: 'POST',
    url: `${credentials.pds}/xrpc/com.atproto.repo.createRecord`,
    contentType: 'application/json',
    body: JSON.stringify({
      repo: credentials.did,
      collection: POST_COLLECTION,
      rkey: frozen.rkey,
      record: postRecord(checked, frozen),
    }),
  });
  const { uri, cid } = successBody(reply, createResponse, 'public', ctx.now());
  return {
    kind: 'published',
    remoteId: uri,
    url: postUrl(credentials.did, frozen.rkey),
    anchor: { cid },
  };
}
