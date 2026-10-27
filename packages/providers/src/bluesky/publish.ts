import {
  isProviderFailure,
  type MediaRef,
  type ProviderError,
  ProviderFailure,
  type PublishContext,
  type PublishInput,
  type PublishItem,
  type PublishOutcome,
  type StepEffect,
  type VerifyOutcome,
} from '@kronaut/core';
import { Temporal } from 'temporal-polyfill';
import * as z from 'zod';
import { unexpectedResponse } from '../_kit/failure.ts';
import { readJson, retryAfter, send, tryJson } from '../_kit/http.ts';
import { errorCode, type ResourceClient, type ResourceReply, resourceClient } from './dpop.ts';
import { buildFacets, type Facet, facetSchema, graphemeCount, utf8Length } from './facets.ts';
import { permanent } from './identity.ts';
import { type BlueskySettings, blueskyManifest } from './manifest.ts';
import type { BlueskyCredentials } from './runtime.ts';
import { TID_PATTERN, tid } from './tid.ts';

const POST_COLLECTION = 'app.bsky.feed.post';
const XRPC_ERROR = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;
const RATE_LIMIT_FALLBACK_MS = 60_000;

const blobRef = z.object({
  $type: z.literal('blob'),
  ref: z.object({ $link: z.string().min(1) }),
  mimeType: z.string().min(1),
  size: z.number().int().nonnegative(),
});
type BlobRef = z.infer<typeof blobRef>;

const publishState = z.object({
  rkey: z.string().regex(TID_PATTERN).optional(),
  createdAt: z.string().min(1).optional(),
  facets: z.array(facetSchema).optional(),
  blobs: z.record(z.string(), blobRef).optional(),
});

const uploadResponse = z.looseObject({ blob: blobRef });
const createResponse = z.looseObject({ uri: z.string().startsWith('at://') });
const recordResponse = z.looseObject({
  uri: z.string(),
  value: z.looseObject({ text: z.string(), createdAt: z.string() }),
});

type Input = PublishInput<BlueskyCredentials, BlueskySettings>;

type Frozen = {
  readonly rkey: string;
  readonly createdAt: string;
  readonly facets?: readonly Facet[];
  readonly blobs: Readonly<Record<string, BlobRef>>;
};

const spec = (() => {
  const post = blueskyManifest.postTypes.find((type) => type.id === 'post');
  if (post?.media.image === undefined) throw new Error('bluesky manifest lacks the post type');
  return { post, image: post.media.image };
})();

function limitOf(counting: 'graphemes' | 'utf8-bytes'): number {
  const limit = spec.post.text.find((entry) => entry.counting === counting);
  if (limit === undefined) throw new Error(`bluesky manifest lacks a ${counting} limit`);
  return limit.max;
}

function checkMedia(media: readonly MediaRef[]): void {
  if (media.length > spec.post.media.maxCount) throw permanent('too_many_images');
  for (const ref of media) {
    if (ref.mime.startsWith('video/') || ref.durationMs !== undefined)
      throw permanent('video_unsupported');
    if (!spec.image.mimes.includes(ref.mime)) throw permanent('media_type_unsupported');
    if (ref.bytes > spec.image.maxBytes) throw permanent('image_too_large');
  }
}

function mainItem(input: Input): PublishItem {
  if (input.postType !== spec.post.id) throw permanent('post_type_unsupported');
  if (input.items.some((item) => item.role !== 'main')) throw permanent('thread_unsupported');
  const [main, ...rest] = input.items;
  if (main === undefined) throw permanent('main_item_missing');
  if (rest.length > 0) throw permanent('main_item_multiple');
  if (main.text === '' && main.media.length === 0) throw permanent('text_empty');
  if (graphemeCount(main.text) > limitOf('graphemes')) throw permanent('text_too_long');
  if (utf8Length(main.text) > limitOf('utf8-bytes')) throw permanent('text_too_many_bytes');
  checkMedia(main.media);
  return main;
}

function isoMillis(now: Temporal.Instant): string {
  return now.toString({ smallestUnit: 'millisecond' });
}

function parseState(state: unknown): z.infer<typeof publishState> {
  const parsed = publishState.safeParse(state);
  if (!parsed.success) throw permanent('state_invalid');
  return parsed.data;
}

function postUrl(did: string, rkey: string): string {
  return `https://bsky.app/profile/${did}/post/${rkey}`;
}

function rateLimitScope(policy: string | null): 'account' | 'instance' {
  return policy !== null && /;\s*w=300\b/.test(policy) ? 'instance' : 'account';
}

function resetAt(headers: Headers, now: Temporal.Instant): Temporal.Instant {
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

function postRecord(item: PublishItem, frozen: Frozen): Record<string, unknown> {
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
  };
}

export async function publishPost(ctx: PublishContext, input: Input): Promise<PublishOutcome> {
  const item = mainItem(input);
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
      record: postRecord(item, frozen),
    }),
  });
  const { uri } = successBody(reply, createResponse, 'public', ctx.now());
  return { kind: 'published', remoteId: uri, url: postUrl(credentials.did, frozen.rkey) };
}

export async function verifyPost(ctx: PublishContext, input: Input): Promise<VerifyOutcome> {
  const { rkey, createdAt } = publishState.safeParse(input.state).data ?? {};
  const text = input.items.find((item) => item.role === 'main')?.text;
  if (rkey === undefined || createdAt === undefined || text === undefined)
    return { kind: 'inconclusive' };
  const { did, pds } = input.credentials;
  const expected = `at://${did}/${POST_COLLECTION}/${rkey}`;
  const query = new URLSearchParams({ repo: did, collection: POST_COLLECTION, rkey });
  try {
    const response = await send(ctx, 'none', `${pds}/xrpc/com.atproto.repo.getRecord?${query}`, {
      headers: { accept: 'application/json' },
    });
    if (response.status === 200) {
      const { uri, value } = await readJson(response, recordResponse, 'none');
      if (uri !== expected || value.createdAt !== createdAt || value.text !== text)
        return { kind: 'inconclusive' };
      return { kind: 'found', remoteId: uri, url: postUrl(did, rkey) };
    }
    if (response.status === 400) {
      if (errorCode(await tryJson(response)) === 'RecordNotFound') return { kind: 'absent' };
    }
    return { kind: 'inconclusive' };
  } catch (error) {
    if (isProviderFailure(error)) return { kind: 'inconclusive' };
    throw error;
  }
}
