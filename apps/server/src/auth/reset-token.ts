import { createHash, createHmac } from 'node:crypto';
import type { Temporal } from 'temporal-polyfill';
import { constantTimeEqual, TOKEN_PREFIX } from '../crypto.ts';

export const RESET_TOKEN_TTL_SECONDS = 15 * 60;
export const RESET_TOKEN_MAX_LENGTH = 512;

const USER_ID_BYTES = 16;
const EXPIRY_BYTES = 8;
const BINDING_BYTES = 16;
const MAC_BYTES = 32;
const SIGNED_BYTES = USER_ID_BYTES + EXPIRY_BYTES + BINDING_BYTES;
const TOKEN_BYTES = SIGNED_BYTES + MAC_BYTES;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const BODY = /^[A-Za-z0-9_-]+$/;

export interface ResetTokenInput {
  readonly userId: string;
  readonly passwordHash: string | null;
  readonly now: Temporal.Instant;
}

export interface VerifiedResetToken {
  readonly userId: string;
  readonly binding: Buffer;
}

export function passwordBinding(passwordHash: string | null): Buffer {
  return createHash('sha256')
    .update(passwordHash ?? '', 'utf8')
    .digest()
    .subarray(0, BINDING_BYTES);
}

function mac(key: Uint8Array, signed: Uint8Array): Buffer {
  return createHmac('sha256', key).update(signed).digest();
}

function uuidBytes(userId: string): Buffer {
  const lowered = userId.toLowerCase();
  if (!UUID.test(lowered)) throw new TypeError('userId must be a uuid');
  return Buffer.from(lowered.replaceAll('-', ''), 'hex');
}

function uuidString(bytes: Buffer): string {
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function epochSeconds(now: Temporal.Instant): bigint {
  return BigInt(Math.floor(now.epochMilliseconds / 1000));
}

export function issueResetToken(key: Uint8Array, input: ResetTokenInput): string {
  const signed = Buffer.alloc(SIGNED_BYTES);
  uuidBytes(input.userId).copy(signed, 0);
  signed.writeBigUInt64BE(epochSeconds(input.now) + BigInt(RESET_TOKEN_TTL_SECONDS), USER_ID_BYTES);
  passwordBinding(input.passwordHash).copy(signed, USER_ID_BYTES + EXPIRY_BYTES);
  const token = Buffer.concat([signed, mac(key, signed)]);
  return `${TOKEN_PREFIX.reset}${token.toString('base64url')}`;
}

export function verifyResetToken(
  key: Uint8Array,
  token: string,
  now: Temporal.Instant,
): VerifiedResetToken | null {
  if (token.length > RESET_TOKEN_MAX_LENGTH || !token.startsWith(TOKEN_PREFIX.reset)) return null;
  const body = token.slice(TOKEN_PREFIX.reset.length);
  if (!BODY.test(body)) return null;
  const bytes = Buffer.from(body, 'base64url');
  if (bytes.length !== TOKEN_BYTES || bytes.toString('base64url') !== body) return null;
  const signed = bytes.subarray(0, SIGNED_BYTES);
  if (!constantTimeEqual(mac(key, signed), bytes.subarray(SIGNED_BYTES))) return null;
  const expiresAt = signed.readBigUInt64BE(USER_ID_BYTES);
  if (expiresAt <= epochSeconds(now)) return null;
  return {
    userId: uuidString(signed.subarray(0, USER_ID_BYTES)),
    binding: Buffer.from(signed.subarray(USER_ID_BYTES + EXPIRY_BYTES)),
  };
}
