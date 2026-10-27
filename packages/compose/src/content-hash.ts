import type { ItemRole } from '@kronaut/core';
import { canonicalizeDoc } from './canonical.ts';
import { canonicalJson } from './jcs.ts';

export const CONTENT_HASH_V = 1;

const PROVIDER_PATTERN = /^[a-z0-9_]{1,40}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const ITEM_ROLES: ReadonlySet<string> = new Set<ItemRole>(['main', 'thread', 'comment']);

export interface HashMedia {
  readonly sha256: string;
  readonly transform: Readonly<Record<string, number>> | null;
  readonly alt: string | null;
  readonly ai: boolean;
}

export interface HashItem {
  readonly role: ItemRole;
  readonly doc: unknown;
  readonly docSchemaV: number;
  readonly media: readonly HashMedia[];
}

export interface ContentHashInput {
  readonly provider: string;
  readonly account: string;
  readonly publishType: string;
  readonly deliveryMode: 'auto' | 'reminder';
  readonly language: string | null;
  readonly items: readonly HashItem[];
  readonly settings: unknown;
}

function hashMediaPayload(media: HashMedia) {
  if (!SHA256_PATTERN.test(media.sha256)) {
    throw new TypeError('contentHash: media sha256 must be 64 lowercase hex characters');
  }
  return {
    sha256: media.sha256,
    transform: media.transform,
    alt: media.alt === null ? null : media.alt.normalize('NFC'),
    ai: media.ai,
  };
}

function hashItemPayload(item: HashItem) {
  if (!ITEM_ROLES.has(item.role)) {
    throw new TypeError('contentHash: unknown item role');
  }
  return {
    role: item.role,
    doc: canonicalizeDoc(item.doc, item.docSchemaV),
    media: item.media.map(hashMediaPayload),
  };
}

export function contentHashPayload(input: ContentHashInput): string {
  if (!PROVIDER_PATTERN.test(input.provider)) {
    throw new TypeError('contentHash: provider must match ^[a-z0-9_]{1,40}$');
  }
  if (!UUID_PATTERN.test(input.account)) {
    throw new TypeError('contentHash: account must be a lowercase canonical uuid');
  }
  if (input.settings === undefined) {
    throw new TypeError('contentHash: settings must be provided');
  }
  return canonicalJson({
    v: CONTENT_HASH_V,
    provider: input.provider,
    account: input.account,
    publish_type: input.publishType,
    delivery_mode: input.deliveryMode,
    language: input.language,
    items: input.items.map(hashItemPayload),
    settings: input.settings,
  });
}

export async function contentHash(input: ContentHashInput): Promise<Uint8Array> {
  const payload = new TextEncoder().encode(contentHashPayload(input));
  return new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', payload));
}

export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
