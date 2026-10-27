import { createHash } from 'node:crypto';

export const STORAGE_KEY_RE = /^[0-9a-f]{64}(\.[a-z0-9]{2,5})?$/;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EXT_RE = /^[a-z0-9]{2,5}$/;
const SHA256_BYTES = 32;

export function isStorageKey(value: string): boolean {
  return typeof value === 'string' && STORAGE_KEY_RE.test(value);
}

export function storageKey(workspaceId: string, masterSha256: Uint8Array, ext?: string): string {
  if (typeof workspaceId !== 'string' || !UUID_RE.test(workspaceId)) {
    throw new TypeError('workspaceId must be a uuid');
  }
  if (!(masterSha256 instanceof Uint8Array) || masterSha256.byteLength !== SHA256_BYTES) {
    throw new TypeError('masterSha256 must be 32 bytes');
  }
  if (ext !== undefined && (typeof ext !== 'string' || !EXT_RE.test(ext))) {
    throw new TypeError('ext must match [a-z0-9]{2,5}');
  }
  const digest = createHash('sha256')
    .update(Buffer.from(workspaceId.replaceAll('-', ''), 'hex'))
    .update(masterSha256)
    .digest('hex');
  return ext === undefined ? digest : `${digest}.${ext}`;
}
