import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import * as z from 'zod';

const BASE64URL = /^[A-Za-z0-9_-]+={0,2}$/;
const ALGORITHM = 'HMAC-SHA256';
const DECODER = new TextDecoder('utf-8', { fatal: true });
const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const CODE_LENGTH = 20;

const PayloadSchema = z.looseObject({
  algorithm: z.string(),
  user_id: z.string().min(1),
});

function payloadUserId(encoded: string): string | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(DECODER.decode(Buffer.from(encoded, 'base64url')));
  } catch {
    return null;
  }
  const payload = PayloadSchema.safeParse(parsed);
  if (!payload.success || payload.data.algorithm.toUpperCase() !== ALGORITHM) return null;
  return payload.data.user_id;
}

export function verifySignedRequest(signedRequest: string, secret: string): string | null {
  const dot = signedRequest.indexOf('.');
  if (dot < 1) return null;
  const encodedSignature = signedRequest.slice(0, dot);
  const encodedPayload = signedRequest.slice(dot + 1);
  if (!BASE64URL.test(encodedSignature) || !BASE64URL.test(encodedPayload)) return null;
  const signature = Buffer.from(encodedSignature, 'base64url');
  const expected = createHmac('sha256', secret).update(encodedPayload, 'utf8').digest();
  if (signature.length !== expected.length || !timingSafeEqual(signature, expected)) return null;
  return payloadUserId(encodedPayload);
}

export function requestHash(signedRequest: string): Buffer {
  return createHash('sha256').update(signedRequest, 'utf8').digest();
}

export function subjectHmac(key: Uint8Array, userId: string): Buffer {
  return createHmac('sha256', key).update(userId, 'utf8').digest();
}

export function newConfirmationCode(): string {
  return [...randomBytes(CODE_LENGTH)].map((byte) => BASE32[byte % BASE32.length]).join('');
}
