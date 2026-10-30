import { Temporal } from 'temporal-polyfill';
import { describe, expect, it } from 'vitest';
import { assertPublicSendOrder, egressError, type ScriptedExchange } from '../_kit/testing.ts';
import { linkedinManifest } from './manifest.ts';
import {
  AUTHOR,
  json,
  main,
  POSTS,
  post,
  REST_HEADERS,
  ref,
  run,
  SENT_AT,
  SHARE,
  TOKEN,
} from './testing.ts';

const INIT = 'https://api.linkedin.com/rest/images?action=initializeUpload';
const UPLOAD = (n: number) => `https://www.linkedin.com/dms-uploads/sp/upload-${n}?ca=vector`;
const UGC = 'urn:li:ugcPost:7123456789012345679';
const DISTRIBUTION = {
  feedDistribution: 'MAIN_FEED',
  targetEntities: [],
  thirdPartyDistributionChannels: [],
};

const init = (n: number, extra: Partial<ScriptedExchange> = {}): ScriptedExchange => ({
  method: 'POST',
  url: INIT,
  json: { value: { uploadUrl: UPLOAD(n), uploadUrlExpiresAt: 1, image: `urn:li:image:C4E${n}` } },
  ...extra,
});
const put = (n: number, extra: Partial<ScriptedExchange> = {}): ScriptedExchange => ({
  method: 'PUT',
  url: UPLOAD(n),
  status: 201,
  ...extra,
});

describe('linkedin publish: request bodies', () => {
  it('posts escaped text-only commentary with the versioned Rest.li headers', async () => {
    const { result, calls, checkpoints, events } = await run(main('Ahoj #svet (test)'), [post()]);
    assertPublicSendOrder(events, linkedinManifest);
    expect(result).toEqual({
      kind: 'published',
      remoteId: SHARE,
      url: `https://www.linkedin.com/feed/update/${SHARE}`,
    });
    expect(calls[0]?.headers).toEqual(REST_HEADERS);
    expect(json(calls[0])).toEqual({
      author: AUTHOR,
      commentary: 'Ahoj \\#svet \\(test\\)',
      visibility: 'PUBLIC',
      distribution: DISTRIBUTION,
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false,
    });
    expect(checkpoints).toEqual([{ sentAt: SENT_AT }]);
    expect(events).toEqual(['step:create_post', 'checkpoint', `request:POST ${POSTS}`]);
  });

  it('uploads one image with its alt text and attaches it as content.media', async () => {
    const { result, calls, checkpoints, events } = await run(
      main('Fotka', [ref('m1', { altText: 'Červená strecha' })]),
      [init(1), put(1), post({ headers: { 'x-restli-id': UGC } })],
    );
    expect(result).toMatchObject({
      remoteId: UGC,
      url: `https://www.linkedin.com/feed/update/${UGC}`,
    });
    expect(calls[0]?.headers).toEqual(REST_HEADERS);
    expect(json(calls[0])).toEqual({ initializeUploadRequest: { owner: AUTHOR } });
    expect(calls[1]?.headers).toEqual({
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'image/png',
    });
    expect(calls[1]?.body).toEqual(new Uint8Array([1, 2, 3]));
    expect(json(calls[2])).toMatchObject({
      commentary: 'Fotka',
      content: { media: { id: 'urn:li:image:C4E1', altText: 'Červená strecha' } },
    });
    expect(checkpoints).toEqual([
      { images: { m1: 'urn:li:image:C4E1' } },
      { images: { m1: 'urn:li:image:C4E1' }, sentAt: SENT_AT },
    ]);
    expect(events.slice(0, 1)).toEqual(['step:upload_images']);
  });

  it('sends 2-20 images as multiImage in order, alt text per image, empty alt text omitted', async () => {
    const refs = [
      ref('m1', { altText: 'Prvá' }),
      ref('m2', { mime: 'image/jpeg', altText: '  ' }),
      ref('m3', { altText: 'Tretia' }),
    ];
    const { calls } = await run(main('', refs), [
      init(1),
      put(1),
      init(2),
      put(2),
      init(3),
      put(3),
      post(),
    ]);
    expect(calls[3]?.headers['Content-Type']).toBe('image/jpeg');
    expect(json(calls[6])).toMatchObject({
      commentary: '',
      content: {
        multiImage: {
          images: [
            { id: 'urn:li:image:C4E1', altText: 'Prvá' },
            { id: 'urn:li:image:C4E2' },
            { id: 'urn:li:image:C4E3', altText: 'Tretia' },
          ],
        },
      },
    });
  });

  it('reuses image URNs from an earlier attempt', async () => {
    const { calls, checkpoints } = await run(
      main('Znova', [ref('m1'), ref('m2')]),
      [init(2), put(2), post()],
      { state: { images: { m1: 'urn:li:image:EARLIER' } } },
    );
    expect(json(calls[2])).toMatchObject({
      content: {
        multiImage: { images: [{ id: 'urn:li:image:EARLIER' }, { id: 'urn:li:image:C4E2' }] },
      },
    });
    expect(checkpoints[0]).toEqual({
      images: { m1: 'urn:li:image:EARLIER', m2: 'urn:li:image:C4E2' },
    });
  });

  it.each([
    'https://uploads.example.org/dms-uploads/x',
    'http://www.linkedin.com/dms-uploads/x',
    'https://www.linkedin.com.evil.example/dms-uploads/x',
    'https://evil-linkedin.com/dms-uploads/x',
    'https://media.linkedin.com/dms-uploads/x',
    'https://user@www.linkedin.com/dms-uploads/x',
    'not a url',
  ])('refuses the upload URL %s before sending any bytes', async (uploadUrl) => {
    const { error, calls } = await run(main('x', [ref('m1')]), [
      init(1, { json: { value: { uploadUrl, image: 'urn:li:image:C4E1' } } }),
    ]);
    expect(error).toEqual({ kind: 'permanent', code: 'upload_url_unexpected' });
    expect(calls.map((call) => call.method)).toEqual(['POST']);
  });
});

describe('linkedin publish: errors', () => {
  it.each<[string, Partial<ScriptedExchange>]>([
    ['a 500', { status: 500, json: { status: 500, message: 'Internal' } }],
    ['a timeout', { error: egressError('timeout') }],
    ['a 201 without x-restli-id', { headers: {} }],
    ['a 409 conflict', { status: 409 }],
  ])('treats %s on create_post as ambiguous', async (_name, reply) => {
    const { error, checkpoints } = await run(main('x'), [post(reply)]);
    expect(error?.kind).toBe('ambiguous');
    expect(checkpoints).toEqual([{ sentAt: SENT_AT }]);
  });

  it('maps definite rejections on create_post', async () => {
    const midnight = Temporal.Instant.from('2026-10-22T00:00:00Z');
    const cases: [Partial<ScriptedExchange>, unknown][] = [
      [{ status: 401, json: { status: 401, message: `token ${TOKEN}` } }, { kind: 'auth_revoked' }],
      [
        { status: 403, json: { status: 403, code: 'ACCESS_DENIED', message: 'Insufficient' } },
        { kind: 'permanent', code: 'permission_missing', detail: '403/ACCESS_DENIED' },
      ],
      [
        { status: 422, json: { status: 422, message: 'Content is a duplicate of urn:li:share:1' } },
        { kind: 'duplicate' },
      ],
      [
        { status: 422, json: { status: 422, message: 'Bad media' } },
        { kind: 'permanent', code: 'unprocessable', detail: 'http_422' },
      ],
      [{ status: 429 }, { kind: 'rate_limited', scope: 'account', resetAt: midnight }],
      [{ status: 400 }, { kind: 'permanent', code: 'invalid_request', detail: 'http_400' }],
    ];
    for (const [reply, expected] of cases) {
      const { error } = await run(main('x'), [post(reply)]);
      expect(error).toEqual(expected);
      expect(JSON.stringify(error)).not.toContain(TOKEN);
    }
  });

  it('treats a 5xx or timeout while uploading as transient and an oversized image as permanent', async () => {
    const item = main('x', [ref('m1')]);
    expect((await run(item, [init(1, { status: 503 })])).error).toEqual({
      kind: 'transient',
      detail: 'http_503',
    });
    expect((await run(item, [init(1), put(1, { status: 502 })])).error).toEqual({
      kind: 'transient',
      detail: 'http_502',
    });
    expect((await run(item, [init(1), put(1, { error: egressError('timeout') })])).error).toEqual({
      kind: 'transient',
      detail: 'timeout',
    });
    expect((await run(item, [init(1), put(1, { status: 413 })])).error).toEqual({
      kind: 'permanent',
      code: 'image_too_large',
      detail: 'http_413',
    });
    expect((await run(item, [init(1, { status: 401 })])).error).toEqual({ kind: 'auth_revoked' });
  });

  it('refuses empty posts and more than 20 images before any request', async () => {
    expect((await run(main('  '), [])).error).toEqual({ kind: 'permanent', code: 'text_empty' });
    const many = Array.from({ length: 21 }, (_, i) => ref(`x${i}`));
    expect((await run(main('x', many), [])).error).toEqual({
      kind: 'permanent',
      code: 'too_many_images',
    });
  });
});
