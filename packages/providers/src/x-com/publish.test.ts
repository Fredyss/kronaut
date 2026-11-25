import { describe, expect, it } from 'vitest';
import { assertPublicSendOrder, egressError } from '../_kit/testing.ts';
import { xManifest } from './manifest.ts';
import { checkMedia } from './media.ts';
import {
  json,
  METADATA_URL,
  mainItem,
  POST_ID,
  photo,
  run,
  TOKEN,
  TWEETS_URL,
  UPLOAD_URL,
} from './testing.ts';

const created = (id = POST_ID, text = 'Hello from Kronaut') => ({
  method: 'POST',
  url: TWEETS_URL,
  status: 201,
  json: { data: { id, text } },
});
const uploaded = (id: string) => ({
  method: 'POST',
  url: UPLOAD_URL,
  json: { data: { id, media_key: `3_${id}`, expires_after_secs: 86_400 } },
});
const metadata = { method: 'POST', url: METADATA_URL, json: { data: { id: '1' } } };

describe('x publish', () => {
  it('creates a text post after checkpointing the send', async () => {
    const { result, calls, events } = await run('publish', [created()]);
    expect(result).toEqual({
      kind: 'published',
      remoteId: POST_ID,
      url: `https://x.com/ada_dev/status/${POST_ID}`,
    });
    expect(calls[0]?.headers).toEqual({
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    });
    expect(json(calls[0]?.body)).toEqual({ text: 'Hello from Kronaut' });
    assertPublicSendOrder(events, xManifest);
  });

  it('uploads images, sets their alt text, then attaches them in order', async () => {
    const items = [mainItem('Two photos', [photo('m1'), photo('m2', { altText: '' })])];
    const { result, calls, checkpoints } = await run(
      'publish',
      [uploaded('101'), metadata, uploaded('102'), created()],
      { items },
    );
    expect(result).toMatchObject({ kind: 'published', remoteId: POST_ID });
    const upload = new TextDecoder().decode(calls[0]?.body as Uint8Array);
    expect(upload).toContain('name="media_category"\r\n\r\ntweet_image');
    expect(upload).toContain('name="media"; filename="image"\r\nContent-Type: image/jpeg');
    expect(json(calls[1]?.body)).toEqual({
      id: '101',
      metadata: { alt_text: { text: 'Alt for m1' } },
    });
    expect(json(calls[3]?.body)).toEqual({
      text: 'Two photos',
      media: { media_ids: ['101', '102'] },
    });
    expect(checkpoints.at(-1)).toMatchObject({
      media: { m1: { id: '101', alt: true }, m2: { id: '102', alt: true } },
      post: { id: POST_ID },
    });
  });

  it('fails an image post when X refuses its alt text', async () => {
    const refusedAlt = { method: 'POST', url: METADATA_URL, status: 400, json: {} };
    const { error } = await run('publish', [uploaded('101'), refusedAlt], {
      items: [mainItem('One photo', [photo('m1')])],
    });
    expect(error).toEqual({ kind: 'permanent', code: 'invalid_request', detail: 'http_400' });
  });

  it('leaves out a whitespace-only text next to images', async () => {
    const items = [mainItem(' \n', [photo('m1', { altText: '' })])];
    const { calls } = await run('publish', [uploaded('101'), created()], { items });
    expect(json(calls[1]?.body)).toEqual({ media: { media_ids: ['101'] } });
  });

  it('reuses uploads from an earlier attempt', async () => {
    const state = { media: { m1: { id: '101', alt: true } } };
    const { calls } = await run('publish', [created()], {
      items: [mainItem('', [photo('m1')])],
      state,
    });
    expect(json(calls[0]?.body)).toEqual({ media: { media_ids: ['101'] } });
  });

  it('replies to the previous chain item', async () => {
    const { calls, result } = await run('publish', [created('1849000000000000002')], {
      items: [{ position: 1, role: 'thread', text: 'Part two', media: [] }],
      chain: [{ position: 0, role: 'main', remoteId: POST_ID }],
    });
    expect(json(calls[0]?.body)).toEqual({
      text: 'Part two',
      reply: { in_reply_to_tweet_id: POST_ID },
    });
    expect(result).toMatchObject({ remoteId: '1849000000000000002' });
  });

  it('returns the stored post without sending again', async () => {
    const { result, calls } = await run('publish', [], { state: { post: { id: POST_ID } } });
    expect(result).toMatchObject({ kind: 'published', remoteId: POST_ID });
    expect(calls).toEqual([]);
  });

  it.each([
    ['a GIF', [photo('m1', { mime: 'image/gif' })], 'media_type_unsupported'],
    ['a large image', [photo('m1', { bytes: 5_000_001 })], 'image_too_large'],
    ['five images', ['a', 'b', 'c', 'd', 'e'].map((id) => photo(id)), 'too_many_images'],
    ['a long alt text', [photo('m1', { altText: 'a'.repeat(1001) })], 'alt_text_too_long'],
  ])('refuses %s before any call', async (_name, media, code) => {
    const { error, calls } = await run('publish', [], { items: [mainItem('x', media)] });
    expect(error).toEqual({ kind: 'permanent', code });
    expect(calls).toEqual([]);
  });

  it('counts alt text in characters, not UTF-16 units', () => {
    expect(() => checkMedia([photo('m1', { altText: '🙂'.repeat(1000) })])).not.toThrow();
  });

  it('refuses a reply without a usable parent', async () => {
    const { error } = await run('publish', [], {
      items: [{ position: 1, role: 'thread', text: 'Part two', media: [] }],
      chain: [{ position: 0, role: 'main', remoteId: 'not-an-id' }],
    });
    expect(error).toEqual({ kind: 'permanent', code: 'reply_parent_missing' });
  });

  it('treats a lost connection after the send as ambiguous', async () => {
    const { error } = await run('publish', [
      { method: 'POST', url: TWEETS_URL, error: egressError('timeout') },
    ]);
    expect(error).toEqual({ kind: 'ambiguous', detail: 'timeout' });
  });
});
