import { createHmac } from 'node:crypto';
import {
  isProviderFailure,
  type MediaRef,
  type ProviderApp,
  type ProviderState,
  type PublishContext,
  type PublishInput,
  type PublishItem,
  type PublishOutcome,
} from '@kronaut/core';
import { describe, expect, it } from 'vitest';
import {
  assertPublicSendOrder,
  egressError,
  type RecordedRequest,
  type ScriptedExchange,
  scriptedHttp,
  TEST_NOW,
  testPublishContext,
} from '../_kit/testing.ts';
import { type FacebookSettings, facebookManifest } from './manifest.ts';
import { type FacebookCredentials, facebookRuntime } from './runtime.ts';

const PAGE_ID = '1012345678901234';
const TOKEN = 'page-token-canary-5d3e';
const SECRET = 'facebook-secret-canary-7c1a';
const PROOF = createHmac('sha256', SECRET).update(TOKEN).digest('hex');
const GRAPH = 'https://graph.facebook.com/v26.0';
const SIGNED = `access_token=${TOKEN}&appsecret_proof=${PROOF}`;
const FEED = `${GRAPH}/${PAGE_ID}/feed`;
const PHOTOS = `${GRAPH}/${PAGE_ID}/photos`;
const POST_ID = `${PAGE_ID}_5550001112223334`;
const PERMALINK = `https://www.facebook.com/kronaut.example/posts/pfbid0abc`;
const PERMALINK_READ = `${GRAPH}/${POST_ID}?fields=id%2Cpermalink_url&${SIGNED}`;
const RECENT = `${GRAPH}/${PAGE_ID}/published_posts?fields=id%2Cmessage%2Ccreated_time%2Cpermalink_url&limit=25&${SIGNED}`;
const SENT_AT = '2026-10-21T12:00:00.000Z';

const app: ProviderApp = {
  clientId: '1234567890123456',
  clientSecret: SECRET,
  publicBaseUrl: 'https://kronaut.example.org',
};

const png: MediaRef = {
  id: 'm1',
  sha256: 'a'.repeat(64),
  mime: 'image/png',
  bytes: 3,
  aiGenerated: false,
};
const jpeg: MediaRef = { ...png, id: 'm2', mime: 'image/jpeg' };
const third: MediaRef = { ...png, id: 'm3' };
const media = {
  m1: { url: 'https://media.example.org/m1', bytes: new Uint8Array([1, 2, 3]) },
  m2: { url: 'https://media.example.org/m2', bytes: new Uint8Array([4]) },
  m3: { url: 'https://media.example.org/m3', bytes: new Uint8Array([5]) },
};

function main(text: string, refs: readonly MediaRef[] = []): PublishItem {
  return { position: 0, role: 'main', text, media: refs };
}

function input(
  items: readonly PublishItem[],
  state: ProviderState = {},
  providerApp: ProviderApp = app,
): PublishInput<FacebookCredentials, FacebookSettings> {
  return {
    destinationId: 'dest-1',
    attemptNo: 1,
    postType: 'post',
    account: { providerAccountId: PAGE_ID },
    credentials: { accessToken: TOKEN },
    app: providerApp,
    settings: {},
    items,
    state,
  };
}

const photo = (id: string, overrides: Partial<ScriptedExchange> = {}): ScriptedExchange => ({
  method: 'POST',
  url: PHOTOS,
  json: { id },
  ...overrides,
});
const feed = (overrides: Partial<ScriptedExchange> = {}): ScriptedExchange => ({
  method: 'POST',
  url: FEED,
  json: { id: POST_ID },
  ...overrides,
});
const permalink = (overrides: Partial<ScriptedExchange> = {}): ScriptedExchange => ({
  url: PERMALINK_READ,
  json: { id: POST_ID, permalink_url: PERMALINK },
  ...overrides,
});
const graphError = (code: number, subcode?: number, extra = {}): Partial<ScriptedExchange> => ({
  status: 400,
  json: { error: { message: 'm', type: 'OAuthException', code, error_subcode: subcode, ...extra } },
});

function form(request: RecordedRequest | undefined): Record<string, string> {
  if (typeof request?.body !== 'string') throw new Error('expected a form body');
  expect(request.headers['content-type']).toBe('application/x-www-form-urlencoded');
  return Object.fromEntries(new URLSearchParams(request.body));
}

interface Part {
  readonly headers: string;
  readonly value: string;
}

function parts(request: RecordedRequest | undefined): Record<string, Part> {
  if (!(request?.body instanceof Uint8Array)) throw new Error('expected a multipart body');
  const boundary = /^multipart\/form-data; boundary=(.+)$/.exec(
    request.headers['content-type'] ?? '',
  )?.[1];
  if (boundary === undefined) throw new Error('expected a multipart boundary');
  const text = new TextDecoder('latin1').decode(request.body);
  expect(text.endsWith(`\r\n--${boundary}--\r\n`)).toBe(true);
  const found: Record<string, Part> = {};
  for (const chunk of text.split(`--${boundary}`).slice(1, -1)) {
    const [headers = '', value = ''] = chunk.slice(2, -2).split('\r\n\r\n');
    const name = /name="([^"]+)"/.exec(headers)?.[1] ?? '';
    found[name] = { headers, value };
  }
  return found;
}

function uploadFields(request: RecordedRequest | undefined): Record<string, string> {
  const { source: _source, ...fields } = parts(request);
  return Object.fromEntries(Object.entries(fields).map(([name, part]) => [name, part.value]));
}

async function outcomeOf(promise: Promise<PublishOutcome>) {
  return promise.then(
    (result) => ({ result, error: undefined }),
    (error: unknown) => {
      if (isProviderFailure(error)) return { result: undefined, error: error.error };
      throw error;
    },
  );
}

async function run(
  item: PublishItem,
  exchanges: readonly ScriptedExchange[],
  options: { readonly state?: ProviderState; readonly now?: typeof TEST_NOW } = {},
) {
  const http = scriptedHttp(exchanges);
  const context = testPublishContext(http, media, options.now);
  const outcome = await outcomeOf(
    facebookRuntime.publish(context.ctx, input([item], options.state)),
  );
  http.assertDone();
  return { ...outcome, calls: http.calls, ...context };
}

const signed = { access_token: TOKEN, appsecret_proof: PROOF };
const attached = (id: string) => JSON.stringify({ media_fbid: id });

describe('facebook publish: request bodies', () => {
  it('posts text to the feed with the Page token and appsecret_proof', async () => {
    const { result, calls, checkpoints, events } = await run(main('Ahoj https://kronaut.example'), [
      feed(),
      permalink(),
    ]);
    expect(result).toEqual({ kind: 'published', remoteId: POST_ID, url: PERMALINK });
    expect(form(calls[0])).toEqual({ message: 'Ahoj https://kronaut.example', ...signed });
    expect(calls[0]?.url).toBe(FEED);
    expect(checkpoints).toEqual([{ sentAt: SENT_AT }]);
    assertPublicSendOrder(events, facebookManifest);
    expect(events).toEqual([
      'step:create_post',
      'checkpoint',
      `request:POST ${FEED}`,
      `request:GET ${PERMALINK_READ}`,
    ]);
  });

  it('uploads one unpublished photo as multipart, then attaches it to the feed post', async () => {
    const { result, calls, checkpoints, events } = await run(main('Fotka', [png]), [
      photo('901'),
      feed(),
      permalink(),
    ]);
    expect(result).toEqual({ kind: 'published', remoteId: POST_ID, url: PERMALINK });
    const upload = parts(calls[0]);
    expect(Object.keys(upload)).toEqual(['access_token', 'appsecret_proof', 'published', 'source']);
    expect(uploadFields(calls[0])).toEqual({ ...signed, published: 'false' });
    expect(upload.source?.headers).toContain('name="source"; filename="upload.png"');
    expect(upload.source?.headers).toContain('Content-Type: image/png');
    expect(upload.source?.value).toBe('\u0001\u0002\u0003');
    expect(calls[0]?.url).toBe(PHOTOS);
    expect(form(calls[1])).toEqual({
      message: 'Fotka',
      'attached_media[0]': attached('901'),
      ...signed,
    });
    expect(checkpoints).toEqual([
      { photos: { m1: '901' }, uploadedAt: SENT_AT },
      { photos: { m1: '901' }, uploadedAt: SENT_AT, sentAt: SENT_AT },
    ]);
    expect(events.filter((event) => event.startsWith('step:'))).toEqual([
      'step:upload_photos',
      'step:create_post',
    ]);
  });

  it('uploads three photos in order with their alt text and omits an empty message', async () => {
    const described = { ...jpeg, altText: 'A red bike' };
    const blank = { ...third, altText: '  ' };
    const { calls } = await run(main('', [png, described, blank]), [
      photo('901'),
      photo('902'),
      photo('903'),
      feed(),
      permalink(),
    ]);
    expect(parts(calls[1]).source?.headers).toContain('filename="upload.jpg"');
    expect(calls.slice(0, 3).map(uploadFields)).toEqual([
      { ...signed, published: 'false' },
      { ...signed, published: 'false', alt_text_custom: 'A red bike' },
      { ...signed, published: 'false' },
    ]);
    expect(form(calls[3])).toEqual({
      'attached_media[0]': attached('901'),
      'attached_media[1]': attached('902'),
      'attached_media[2]': attached('903'),
      ...signed,
    });
  });

  it('rejects invalid input before any network call', async () => {
    const reject = async (items: readonly PublishItem[], providerApp = app) => {
      const http = scriptedHttp([]);
      const { ctx } = testPublishContext(http, media);
      const { error } = await outcomeOf(
        facebookRuntime.publish(ctx, input(items, {}, providerApp)),
      );
      expect(http.calls).toHaveLength(0);
      return error;
    };
    const many = Array.from({ length: 11 }, (_, n) => ({ ...png, id: `m${n}` }));
    expect(await reject([main(' ')])).toEqual({ kind: 'permanent', code: 'text_empty' });
    expect(await reject([main('x', many)])).toEqual({ kind: 'permanent', code: 'too_many_images' });
    expect(await reject([main('x', [{ ...png, mime: 'image/gif' }])])).toEqual({
      kind: 'permanent',
      code: 'media_type_unsupported',
    });
    expect(await reject([main('x', [{ ...png, altText: 'a'.repeat(1_001) }])])).toEqual({
      kind: 'permanent',
      code: 'alt_text_too_long',
    });
    const { clientSecret: _, ...withoutSecret } = app;
    expect(await reject([main('x')], withoutSecret)).toEqual({
      kind: 'app_config',
      code: 'client_secret_missing',
    });
  });
});

describe('facebook publish: retries and results', () => {
  it('reuses a stored photo id and uploads only the rest', async () => {
    const state = {
      photos: { m1: '901' },
      uploadedAt: TEST_NOW.subtract({ hours: 19 }).toString(),
    };
    const { calls, checkpoints } = await run(
      main('Dve', [png, jpeg]),
      [photo('902'), feed(), permalink()],
      {
        state,
      },
    );
    expect(calls.map((call) => call.url)).toEqual([PHOTOS, FEED, PERMALINK_READ]);
    expect(form(calls[1])).toMatchObject({
      'attached_media[0]': attached('901'),
      'attached_media[1]': attached('902'),
    });
    expect(checkpoints[0]).toEqual({ ...state, photos: { m1: '901', m2: '902' } });
  });

  it('uploads every photo again once the first upload is 20 hours old', async () => {
    const state = {
      photos: { m1: '901' },
      uploadedAt: TEST_NOW.subtract({ hours: 20 }).toString(),
    };
    const { calls, checkpoints } = await run(
      main('Dve', [png, jpeg]),
      [photo('911'), photo('912'), feed(), permalink()],
      { state },
    );
    expect(calls.map((call) => call.url)).toEqual([PHOTOS, PHOTOS, FEED, PERMALINK_READ]);
    expect(form(calls[2])).toMatchObject({ 'attached_media[0]': attached('911') });
    expect(checkpoints[0]).toEqual({ photos: { m1: '911' }, uploadedAt: SENT_AT });
  });

  it('falls back to the post id URL when the permalink read fails', async () => {
    for (const failed of [{ status: 500 }, { json: { id: POST_ID } }, graphError(100)]) {
      const { result } = await run(main('Ahoj'), [feed(), permalink(failed)]);
      expect(result).toEqual({
        kind: 'published',
        remoteId: POST_ID,
        url: `https://www.facebook.com/${POST_ID}`,
      });
    }
  });
});

describe('facebook publish: errors', () => {
  it('never retries an ambiguous create_post, but retries a failed upload', async () => {
    for (const failure of [{ status: 502 }, { error: egressError('timeout') }, graphError(2)]) {
      const { error, events } = await run(main('Ahoj'), [feed(failure)]);
      expect(error).toMatchObject({ kind: 'ambiguous' });
      expect(events).toContain('step:create_post');
    }
    const upload = await run(main('Ahoj', [png]), [photo('901', graphError(2))]);
    expect(upload.error).toEqual({ kind: 'transient', detail: '2' });
    expect(upload.events).not.toContain('step:create_post');
  });

  it('maps rate limits, using the Business Use Case header when it is there', async () => {
    const usage = JSON.stringify({
      [PAGE_ID]: [{ type: 'pages', call_count: 100, estimated_time_to_regain_access: 30 }],
    });
    const page = await run(main('Ahoj'), [
      feed({ ...graphError(80001), headers: { 'x-business-use-case-usage': usage } }),
    ]);
    expect(page.error).toEqual({
      kind: 'rate_limited',
      scope: 'account',
      resetAt: TEST_NOW.add({ minutes: 30 }),
    });
    const app = await run(main('Ahoj'), [feed(graphError(4))]);
    expect(app.error).toEqual({
      kind: 'rate_limited',
      scope: 'app',
      resetAt: TEST_NOW.add({ hours: 1 }),
    });
  });

  it('maps auth, permission, content and media errors', async () => {
    const errorOf = async (failure: Partial<ScriptedExchange>) =>
      (await run(main('Ahoj'), [feed(failure)])).error;
    expect(await errorOf(graphError(190, 463))).toEqual({ kind: 'auth_expired' });
    expect(await errorOf(graphError(190, 460))).toEqual({ kind: 'auth_revoked' });
    expect(await errorOf(graphError(1, 2853006))).toEqual({ kind: 'auth_revoked' });
    expect(await errorOf(graphError(200))).toEqual({
      kind: 'permanent',
      code: 'permission_missing',
      detail: '200',
    });
    expect(await errorOf(graphError(368))).toEqual({
      kind: 'permanent',
      code: 'policy_blocked',
      detail: '368',
    });
    expect(await errorOf(graphError(506))).toEqual({ kind: 'duplicate' });
    expect(await errorOf(graphError(1609005))).toEqual({
      kind: 'permanent',
      code: 'link_error',
      detail: '1609005',
    });
    const image = await run(main('Ahoj', [png]), [photo('901', graphError(324, 2069019))]);
    expect(image.error).toEqual({
      kind: 'permanent',
      code: 'invalid_image',
      detail: '324/2069019',
    });
  });

  it('never puts the token, secret or proof into an error', async () => {
    const echo = graphError(190, 460, { message: `bad token ${TOKEN}` });
    const failures = [
      await run(main('Ahoj'), [feed(echo)]),
      await run(main('Ahoj', [png]), [photo('901', { status: 503 })]),
      await run(main('Ahoj'), [feed({ error: egressError('timeout') })]),
      await run(main('Ahoj'), [feed(graphError(999))]),
    ];
    for (const { error } of failures) {
      expect(error).toBeDefined();
      for (const secret of [TOKEN, SECRET, PROOF])
        expect(JSON.stringify(error)).not.toContain(secret);
    }
  });
});

describe('facebook verify', () => {
  const sent = { sentAt: SENT_AT };
  const ours = {
    id: POST_ID,
    message: 'Ahoj z Facebooku',
    created_time: '2026-10-21T12:00:04+0000',
    permalink_url: PERMALINK,
  };

  async function verify(data: readonly unknown[], items = [main('Ahoj z Facebooku')], minutes = 0) {
    const http = scriptedHttp([{ url: RECENT, json: { data } }]);
    const { ctx } = testPublishContext(http, media, TEST_NOW.add({ minutes }));
    const refusing: PublishContext = {
      ...ctx,
      step: () => Promise.reject(new Error('verify must not run steps')),
      checkpoint: () => Promise.reject(new Error('verify must not checkpoint')),
    };
    if (facebookRuntime.verify === undefined) throw new Error('facebook verifies');
    const result = await facebookRuntime.verify(refusing, input(items, sent));
    http.assertDone();
    return result;
  }

  it('finds exactly one recent post with the same text', async () => {
    const other = { ...ours, id: `${PAGE_ID}_2`, message: 'Iný text' };
    const older = { ...ours, id: `${PAGE_ID}_3`, created_time: '2026-10-21T11:57:59+0000' };
    expect(await verify([other, ours, older])).toEqual({
      kind: 'found',
      remoteId: POST_ID,
      url: PERMALINK,
    });
    expect(await verify([ours, { ...ours, id: `${PAGE_ID}_4` }])).toEqual({ kind: 'inconclusive' });
  });

  it('compares text after NFC and trimming, and matches an empty text to no message', async () => {
    const decomposed = { ...ours, message: '  Café \n' };
    expect(await verify([decomposed], [main('Café')])).toMatchObject({ kind: 'found' });
    const { message: _message, ...bare } = ours;
    expect(await verify([bare], [main('', [png])])).toMatchObject({ kind: 'found' });
    expect(await verify([ours], [main('', [png])])).toEqual({ kind: 'inconclusive' });
  });

  it('reads created_time as ISO 8601 or as a UNIX number', async () => {
    const unix = TEST_NOW.epochMilliseconds / 1000;
    expect(await verify([{ ...ours, created_time: unix + 4 }])).toMatchObject({ kind: 'found' });
    expect(await verify([{ ...ours, created_time: String(unix - 600) }])).toEqual({
      kind: 'inconclusive',
    });
  });

  it('is absent only once the verify window has elapsed', async () => {
    expect(await verify([], undefined, 30)).toEqual({ kind: 'inconclusive' });
    expect(await verify([], undefined, 60)).toEqual({ kind: 'absent' });
  });
});
