import { type BaseContext, isProviderFailure } from '@kronaut/core';
import * as z from 'zod';
import { send, tryJson } from '../_kit/http.ts';
import { blueskyCredentials } from './credentials.ts';
import { epochSeconds, errorCode, type ResourceClient, resourceClient } from './dpop.ts';

export const VIDEO_SERVICE_URL = 'https://video.bsky.app';
export const VIDEO_SERVICE_DID = 'did:web:video.bsky.app';

const UPLOAD_BLOB = 'com.atproto.repo.uploadBlob';
const UPLOAD_VIDEO = 'app.bsky.video.uploadVideo';
const UPLOAD_LIMITS = 'app.bsky.video.getUploadLimits';
const UPLOAD_TOKEN_TTL_S = 30 * 60;
const LIMITS_TOKEN_TTL_S = 60;
const CODE = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;
const UNPRINTABLE = /[\p{Cc}\p{Cf}]+/gu;
const MESSAGE_MAX = 200;

export type VideoCheckId = 'upload_token' | 'video_token' | 'limits_token' | 'upload_limits';

export type VideoCheckResult =
  | { readonly outcome: 'ok' }
  | { readonly outcome: 'refused'; readonly status: number; readonly code?: string }
  | { readonly outcome: 'failed'; readonly kind: string }
  | { readonly outcome: 'skipped' };

export interface VideoCheck {
  readonly id: VideoCheckId;
  readonly result: VideoCheckResult;
}

const uploadLimits = z.looseObject({
  canUpload: z.boolean(),
  remainingDailyVideos: z.number().int().optional(),
  remainingDailyBytes: z.number().int().optional(),
  message: z.string().optional(),
  error: z.string().optional(),
});

export interface UploadLimits {
  readonly canUpload: boolean;
  readonly remainingDailyVideos?: number;
  readonly remainingDailyBytes?: number;
  readonly error?: string;
  readonly message?: string;
}

export interface VideoCheckReport {
  readonly checks: readonly VideoCheck[];
  readonly limits?: UploadLimits;
}

export type VideoVerdict = 'ready' | 'account_blocked' | 'upload_refused' | 'inconclusive';

const serviceToken = z.looseObject({ token: z.string().min(1) });

const OK: VideoCheckResult = { outcome: 'ok' };
const SKIPPED: VideoCheckResult = { outcome: 'skipped' };
const UNEXPECTED: VideoCheckResult = { outcome: 'failed', kind: 'unexpected_response' };

interface Step<T> {
  readonly result: VideoCheckResult;
  readonly value?: T;
}

interface TokenRequest {
  readonly aud: string;
  readonly lxm: string;
  readonly ttlSeconds: number;
}

function errorCodeOf(body: unknown): string | undefined {
  const code = errorCode(body);
  return code !== undefined && CODE.test(code) ? code : undefined;
}

function printable(text: string): string | undefined {
  const clean = text.replace(UNPRINTABLE, ' ').replace(/\s+/g, ' ').trim().slice(0, MESSAGE_MAX);
  return clean === '' ? undefined : clean;
}

function limitsOf(raw: z.infer<typeof uploadLimits>): UploadLimits {
  const error = errorCodeOf(raw);
  const message = raw.message === undefined ? undefined : printable(raw.message);
  return {
    canUpload: raw.canUpload,
    ...(raw.remainingDailyVideos === undefined
      ? {}
      : { remainingDailyVideos: raw.remainingDailyVideos }),
    ...(raw.remainingDailyBytes === undefined
      ? {}
      : { remainingDailyBytes: raw.remainingDailyBytes }),
    ...(error === undefined ? {} : { error }),
    ...(message === undefined ? {} : { message }),
  };
}

function refusal(status: number, body: unknown): VideoCheckResult {
  if (status === 429) return { outcome: 'failed', kind: 'rate_limited' };
  if (status >= 500) return { outcome: 'failed', kind: 'transient' };
  const code = errorCodeOf(body);
  return { outcome: 'refused', status, ...(code === undefined ? {} : { code }) };
}

async function attempt<T>(run: () => Promise<Step<T>>): Promise<Step<T>> {
  try {
    return await run();
  } catch (err) {
    if (isProviderFailure(err)) return { result: { outcome: 'failed', kind: err.error.kind } };
    throw err;
  }
}

async function mint(
  ctx: BaseContext,
  client: ResourceClient,
  pds: string,
  request: TokenRequest,
): Promise<Step<string>> {
  const url = new URL('/xrpc/com.atproto.server.getServiceAuth', pds);
  url.searchParams.set('aud', request.aud);
  url.searchParams.set('lxm', request.lxm);
  url.searchParams.set('exp', String(epochSeconds(ctx.now()) + request.ttlSeconds));
  const reply = await client('none', { method: 'GET', url: url.href });
  if (reply.response.status !== 200) return { result: refusal(reply.response.status, reply.body) };
  const parsed = serviceToken.safeParse(reply.body);
  return parsed.success ? { result: OK, value: parsed.data.token } : { result: UNEXPECTED };
}

async function readLimits(ctx: BaseContext, token: string): Promise<Step<UploadLimits>> {
  const response = await send(ctx, 'none', `${VIDEO_SERVICE_URL}/xrpc/${UPLOAD_LIMITS}`, {
    method: 'GET',
    headers: { accept: 'application/json', authorization: `Bearer ${token}` },
  });
  const body = await tryJson(response);
  if (response.status !== 200) return { result: refusal(response.status, body) };
  const parsed = uploadLimits.safeParse(body);
  return parsed.success ? { result: OK, value: limitsOf(parsed.data) } : { result: UNEXPECTED };
}

export async function checkVideoAuth(ctx: BaseContext, value: unknown): Promise<VideoCheckReport> {
  const credentials = blueskyCredentials.parse(value);
  const client = resourceClient(ctx, {
    accessToken: credentials.accessToken,
    dpopJwk: credentials.dpopJwk,
    ...(credentials.pdsNonce === undefined ? {} : { nonce: credentials.pdsNonce }),
  });
  const token = (request: TokenRequest) =>
    attempt(() => mint(ctx, client, credentials.pds, request));
  const pdsDid = `did:web:${new URL(credentials.pds).host}`;
  const upload = await token({ aud: pdsDid, lxm: UPLOAD_BLOB, ttlSeconds: UPLOAD_TOKEN_TTL_S });
  const video = await token({
    aud: VIDEO_SERVICE_DID,
    lxm: UPLOAD_VIDEO,
    ttlSeconds: UPLOAD_TOKEN_TTL_S,
  });
  const limitsToken = await token({
    aud: VIDEO_SERVICE_DID,
    lxm: UPLOAD_LIMITS,
    ttlSeconds: LIMITS_TOKEN_TTL_S,
  });
  const granted = limitsToken.value;
  const limits =
    granted === undefined ? { result: SKIPPED } : await attempt(() => readLimits(ctx, granted));
  return {
    checks: [
      { id: 'upload_token', result: upload.result },
      { id: 'video_token', result: video.result },
      { id: 'limits_token', result: limitsToken.result },
      { id: 'upload_limits', result: limits.result },
    ],
    ...(limits.value === undefined ? {} : { limits: limits.value }),
  };
}

function resultOf(report: VideoCheckReport, id: VideoCheckId): VideoCheckResult | undefined {
  return report.checks.find((check) => check.id === id)?.result;
}

export function videoVerdict(report: VideoCheckReport): VideoVerdict {
  const upload = resultOf(report, 'upload_token')?.outcome;
  const otherMinted = (['video_token', 'limits_token'] as const).some(
    (id) => resultOf(report, id)?.outcome === 'ok',
  );
  if (upload === 'refused' && otherMinted) return 'upload_refused';
  const limits = report.limits;
  if (
    upload !== 'ok' ||
    resultOf(report, 'upload_limits')?.outcome !== 'ok' ||
    limits === undefined
  )
    return 'inconclusive';
  return limits.canUpload ? 'ready' : 'account_blocked';
}
