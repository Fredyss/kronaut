import {
  appendSignature,
  type ContentHashInput,
  canonicalizeDoc,
  type DraftItem,
  type HashItem,
  toPlainText,
} from '@kronaut/compose';
import type { MediaRef, PublishItem } from '@kronaut/core';
import * as z from 'zod';

export const SNAPSHOT_V = 1;

const SHA256_HEX = /^[0-9a-f]{64}$/;

export const MediaSnapshotSchema = z.object({
  assetId: z.uuid(),
  sha256: z.string().regex(SHA256_HEX),
  kind: z.enum(['image', 'video']),
  mime: z.string().min(1),
  bytes: z.number().int().nonnegative(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  durationMs: z.number().int().nonnegative().optional(),
  altText: z.string().nullable(),
  aiGenerated: z.boolean(),
  transform: z.record(z.string(), z.number().int()).nullable(),
});

export const ItemSnapshotSchema = z.object({
  position: z.number().int().min(0).max(99),
  role: z.enum(['main', 'thread', 'comment']),
  doc: z.unknown(),
  docSchemaV: z.number().int().positive(),
  media: z.array(MediaSnapshotSchema).max(35),
});

export const VariantSnapshotSchema = z.object({
  id: z.uuid(),
  isDefault: z.boolean(),
  contentLanguage: z.string().nullable(),
  items: z.array(ItemSnapshotSchema).min(1),
});

export const DestinationSnapshotSchema = z.object({
  socialAccountId: z.uuid(),
  provider: z.string().regex(/^[a-z0-9_]{1,40}$/),
  publishType: z.string().regex(/^[a-z0-9_]{1,40}$/),
  variantId: z.uuid(),
  deliveryMode: z.enum(['auto', 'reminder']),
  settings: z.unknown(),
  signature: z.unknown().optional(),
});

export const RevisionSnapshotSchema = z.object({
  v: z.literal(SNAPSHOT_V),
  postId: z.uuid(),
  postVersion: z.number().int().positive(),
  variants: z.array(VariantSnapshotSchema).min(1),
  destinations: z.array(DestinationSnapshotSchema),
});

export type MediaSnapshot = z.output<typeof MediaSnapshotSchema>;
export type ItemSnapshot = z.output<typeof ItemSnapshotSchema>;
export type VariantSnapshot = z.output<typeof VariantSnapshotSchema>;
export type DestinationSnapshot = z.output<typeof DestinationSnapshotSchema>;
export type RevisionSnapshot = z.output<typeof RevisionSnapshotSchema>;

export class SnapshotError extends Error {
  readonly code: 'destination_missing' | 'variant_missing';

  constructor(code: 'destination_missing' | 'variant_missing') {
    super(code);
    this.name = 'SnapshotError';
    this.code = code;
  }
}

export function parseSnapshot(json: unknown): RevisionSnapshot {
  return RevisionSnapshotSchema.parse(json);
}

export interface DestinationKey {
  readonly socialAccountId: string;
  readonly publishType: string;
}

export interface ResolvedDestination {
  readonly destination: DestinationSnapshot;
  readonly variant: VariantSnapshot;
  readonly items: readonly ItemSnapshot[];
}

function signed(items: readonly ItemSnapshot[], signature: unknown): ItemSnapshot[] {
  return items.map((item) =>
    item.role === 'main'
      ? {
          ...item,
          doc: appendSignature(
            canonicalizeDoc(item.doc, item.docSchemaV),
            canonicalizeDoc(signature, item.docSchemaV),
          ),
        }
      : item,
  );
}

export function resolveDestination(
  snapshot: RevisionSnapshot,
  key: DestinationKey,
): ResolvedDestination {
  const destination = snapshot.destinations.find(
    (d) =>
      d.socialAccountId === key.socialAccountId.toLowerCase() && d.publishType === key.publishType,
  );
  if (destination === undefined) throw new SnapshotError('destination_missing');
  const variant = snapshot.variants.find((v) => v.id === destination.variantId);
  if (variant === undefined) throw new SnapshotError('variant_missing');
  const items = [...variant.items].sort((a, b) => a.position - b.position);
  const { signature } = destination;
  return {
    destination,
    variant,
    items: signature === undefined ? items : signed(items, signature),
  };
}

export function contentHashInput(resolved: ResolvedDestination): ContentHashInput {
  const { destination, variant, items } = resolved;
  return {
    provider: destination.provider,
    account: destination.socialAccountId,
    publishType: destination.publishType,
    deliveryMode: destination.deliveryMode,
    language: variant.contentLanguage,
    items: items.map(
      (item): HashItem => ({
        role: item.role,
        doc: item.doc,
        docSchemaV: item.docSchemaV,
        media: item.media.map((m) => ({
          sha256: m.sha256,
          transform: m.transform,
          alt: m.altText,
          ai: m.aiGenerated,
        })),
      }),
    ),
    settings: destination.settings,
  };
}

function mediaRef(m: MediaSnapshot): MediaRef {
  return {
    id: m.assetId,
    sha256: m.sha256,
    mime: m.mime,
    bytes: m.bytes,
    aiGenerated: m.aiGenerated,
    ...(m.width === undefined ? {} : { width: m.width }),
    ...(m.height === undefined ? {} : { height: m.height }),
    ...(m.durationMs === undefined ? {} : { durationMs: m.durationMs }),
    ...(m.altText === null ? {} : { altText: m.altText }),
  };
}

function itemText(item: ItemSnapshot): string {
  return toPlainText(canonicalizeDoc(item.doc, item.docSchemaV));
}

export function publishItems(resolved: ResolvedDestination): PublishItem[] {
  const language = resolved.variant.contentLanguage;
  return resolved.items.map((item) => ({
    position: item.position,
    role: item.role,
    text: itemText(item),
    media: item.media.map(mediaRef),
    ...(language === null ? {} : { language }),
  }));
}

export function draftItems(resolved: ResolvedDestination): DraftItem[] {
  return resolved.items.map((item) => ({
    role: item.role,
    text: itemText(item),
    media: item.media.map((m) => ({
      kind: m.kind,
      mime: m.mime,
      bytes: m.bytes,
      ...(m.width === undefined ? {} : { width: m.width }),
      ...(m.height === undefined ? {} : { height: m.height }),
      ...(m.durationMs === undefined ? {} : { durationMs: m.durationMs }),
      ...(m.altText === null ? {} : { altText: m.altText }),
    })),
  }));
}
