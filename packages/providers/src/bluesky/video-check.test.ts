import { describe, expect, it } from 'vitest';
import { egressError, type ScriptedExchange, scriptedHttp, TEST_NOW } from '../_kit/testing.ts';
import type { BlueskyCredentials } from './credentials.ts';
import { generateDpopKey } from './dpop.ts';
import { AS, context, DID, failureOf, PDS, TOKEN } from './testing.ts';
import {
  checkVideoAuth,
  displayHandle,
  VIDEO_SERVICE_DID,
  VIDEO_SERVICE_URL,
  type VideoCheckReport,
  videoVerdict,
} from './video-check.ts';

const credentials: BlueskyCredentials = {
  did: DID,
  pds: PDS,
  issuer: AS,
  tokenEndpoint: TOKEN,
  accessToken: 'CANARY_access',
  refreshToken: 'CANARY_refresh',
  dpopJwk: await generateDpopKey(),
  pdsNonce: 'pn0',
};

const SERVICE_AUTH = new RegExp(`^${PDS}/xrpc/com\\.atproto\\.server\\.getServiceAuth\\?`);
const LIMITS = `${VIDEO_SERVICE_URL}/xrpc/app.bsky.video.getUploadLimits`;
const NOW_S = TEST_NOW.epochMilliseconds / 1000;

function minted(token: string): ScriptedExchange {
  return { url: SERVICE_AUTH, headers: { 'dpop-nonce': 'pn1' }, json: { token } };
}

function refused(status: number, error: string): ScriptedExchange {
  return { url: SERVICE_AUTH, status, headers: { 'dpop-nonce': 'pn1' }, json: { error } };
}

function limits(json: unknown, status = 200): ScriptedExchange {
  return { url: LIMITS, status, json };
}

async function run(script: readonly ScriptedExchange[]) {
  const http = scriptedHttp(script);
  const report = await checkVideoAuth(context(http), credentials);
  http.assertDone();
  return { http, report };
}

function outcomes(report: VideoCheckReport) {
  return Object.fromEntries(report.checks.map((check) => [check.id, check.result]));
}

describe('bluesky video check', () => {
  it('mints the tutorial upload token and reads the upload limits with a service token', async () => {
    const { http, report } = await run([
      minted('CANARY_upload'),
      minted('CANARY_video'),
      minted('CANARY_limits'),
      limits({ canUpload: true, remainingDailyVideos: 25, remainingDailyBytes: 10_000 }),
    ]);
    const queries = http.calls.slice(0, 3).map((call) => new URL(call.url).searchParams);
    expect(queries.map((q) => [q.get('aud'), q.get('lxm'), Number(q.get('exp')) - NOW_S])).toEqual([
      ['did:web:pds.example.net', 'com.atproto.repo.uploadBlob', 1800],
      [VIDEO_SERVICE_DID, 'app.bsky.video.uploadVideo', 1800],
      [VIDEO_SERVICE_DID, 'app.bsky.video.getUploadLimits', 60],
    ]);
    expect(http.calls[0]?.headers.authorization).toBe('DPoP CANARY_access');
    expect(http.calls[0]?.headers.dpop).toBeDefined();
    expect(http.calls[3]?.headers.authorization).toBe('Bearer CANARY_limits');
    expect(http.calls[3]?.headers.dpop).toBeUndefined();
    expect(report.limits).toEqual({
      canUpload: true,
      remainingDailyVideos: 25,
      remainingDailyBytes: 10_000,
    });
    expect(videoVerdict(report)).toBe('ready');
    expect(JSON.stringify(report)).not.toContain('CANARY');
  });

  it('reports a refused upload token while the session mints other tokens', async () => {
    const { report } = await run([
      refused(400, 'InvalidRequest'),
      minted('video'),
      minted('limits'),
      limits({ canUpload: true }),
    ]);
    expect(outcomes(report).upload_token).toEqual({
      outcome: 'refused',
      status: 400,
      code: 'InvalidRequest',
    });
    expect(videoVerdict(report)).toBe('upload_refused');
  });

  it('skips the limits read when no limits token is minted, and stays inconclusive', async () => {
    const { report } = await run([
      refused(401, 'invalid_token'),
      refused(401, 'invalid_token'),
      refused(401, 'invalid_token'),
    ]);
    expect(outcomes(report).upload_limits).toEqual({ outcome: 'skipped' });
    expect(report.limits).toBeUndefined();
    expect(videoVerdict(report)).toBe('inconclusive');
  });

  it('keeps a valid error code and a printable message when the account cannot upload', async () => {
    const { report } = await run([
      minted('upload'),
      minted('video'),
      minted('limits'),
      limits({ canUpload: false, error: 'EmailUnverified', message: 'Verify\u001b[31m‮ email' }),
    ]);
    expect(report.limits).toEqual({
      canUpload: false,
      error: 'EmailUnverified',
      message: 'Verify [31m email',
    });
    expect(videoVerdict(report)).toBe('account_blocked');
  });

  it('drops an error code that is not a plain identifier', async () => {
    const { report } = await run([
      minted('upload'),
      minted('video'),
      minted('limits'),
      limits({ canUpload: false, error: 'not a code\n' }),
    ]);
    expect(report.limits).toEqual({ canUpload: false });
  });

  it('treats a busy server, rate limits and network errors as failed checks, not refusals', async () => {
    const { report } = await run([
      refused(503, 'ServiceUnavailable'),
      refused(429, 'RateLimitExceeded'),
      minted('limits'),
      { url: LIMITS, error: egressError('timeout') },
    ]);
    expect(outcomes(report)).toMatchObject({
      upload_token: { outcome: 'failed', kind: 'transient' },
      video_token: { outcome: 'failed', kind: 'rate_limited' },
      limits_token: { outcome: 'ok' },
      upload_limits: { outcome: 'failed' },
    });
    expect(videoVerdict(report)).toBe('inconclusive');
  });

  it('marks a refused or malformed limits response', async () => {
    const malformed = await run([
      minted('upload'),
      minted('video'),
      minted('limits'),
      limits({ remaining: 1 }),
    ]);
    expect(outcomes(malformed.report).upload_limits).toEqual({
      outcome: 'failed',
      kind: 'unexpected_response',
    });
    const rejected = await run([
      minted('upload'),
      minted('video'),
      minted('limits'),
      limits({ error: 'AuthMissing' }, 401),
    ]);
    expect(outcomes(rejected.report).upload_limits).toEqual({
      outcome: 'refused',
      status: 401,
      code: 'AuthMissing',
    });
    expect(videoVerdict(rejected.report)).toBe('inconclusive');
  });
  it('fails with a provider error, before any request, when the stored credential is invalid', async () => {
    const http = scriptedHttp([]);
    for (const value of [{ did: DID }, { ...credentials, pds: 'not a url' }]) {
      expect(await failureOf(checkVideoAuth(context(http), value))).toEqual({
        kind: 'permanent',
        code: 'credentials_invalid',
      });
    }
    http.assertDone();
  });

  it('keeps the code of a permanent failure, such as a blocked host', async () => {
    const { report } = await run([
      minted('upload'),
      minted('video'),
      minted('limits'),
      { url: LIMITS, error: egressError('blocked_private_address') },
    ]);
    expect(outcomes(report).upload_limits).toEqual({
      outcome: 'failed',
      kind: 'permanent',
      code: 'egress_blocked',
    });
  });

  it('does not read a refused expiry as a refusal of the session', async () => {
    const { report } = await run([
      refused(400, 'BadExpiration'),
      minted('video'),
      minted('limits'),
      limits({ canUpload: true }),
    ]);
    expect(videoVerdict(report)).toBe('inconclusive');
  });

  it('shows a handle only when it is a plain, lowercase handle', () => {
    expect(displayHandle('alice.bsky.social')).toBe('alice.bsky.social');
    expect(displayHandle('Alice.bsky.social')).toBeUndefined();
    expect(displayHandle('alice.bsky.social\u001b]52;c;x\u0007')).toBeUndefined();
    expect(displayHandle('a\nverdict: ok.example.com')).toBeUndefined();
    expect(displayHandle(null)).toBeUndefined();
  });
});
