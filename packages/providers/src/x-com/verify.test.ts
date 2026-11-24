import { describe, expect, it } from 'vitest';
import { mainItem, POST_ID, photo, run, SENT_AT, USER_ID } from './testing.ts';

const TIMELINE = `https://api.x.com/2/users/${USER_ID}/tweets?max_results=10&tweet.fields=created_at%2Ctext%2Centities%2Creferenced_tweets`;
const PARENT = '1849000000000000000';

const post = (id: string, text: string, createdAt = SENT_AT, extra: object = {}) => ({
  id,
  text,
  created_at: createdAt,
  ...extra,
});
const timeline = (data: readonly object[]) => ({ url: TIMELINE, json: { data } });
const state = { sentAt: SENT_AT };

describe('x verify', () => {
  it('claims the one post with the sent text created since 30 s before the send', async () => {
    const { result } = await run(
      'verify',
      [
        timeline([
          post(POST_ID, 'Hello from Kronaut', '2026-10-21T12:00:00Z'),
          post('1', 'Hello from Kronaut', '2026-10-21T11:59:29Z'),
          post('2', 'Something else'),
        ]),
      ],
      { state },
    );
    expect(result).toEqual({
      kind: 'found',
      remoteId: POST_ID,
      url: `https://x.com/ada_dev/status/${POST_ID}`,
    });
  });

  it('tolerates a server clock ahead of X', async () => {
    const { result } = await run(
      'verify',
      [timeline([post(POST_ID, 'Hello from Kronaut', '2026-10-21T11:59:58Z')])],
      { state },
    );
    expect(result).toMatchObject({ kind: 'found', remoteId: POST_ID });
  });

  it('is inconclusive on two matches, none, or a failed read', async () => {
    const twice = [post('1', 'Hello from Kronaut'), post('2', 'Hello from Kronaut')];
    expect((await run('verify', [timeline(twice)], { state })).result).toEqual({
      kind: 'inconclusive',
    });
    expect((await run('verify', [timeline([])], { state })).result).toEqual({
      kind: 'inconclusive',
    });
    expect((await run('verify', [{ url: TIMELINE, status: 503 }], { state })).result).toEqual({
      kind: 'inconclusive',
    });
  });

  it('restores t.co links and drops the media link before comparing', async () => {
    const sent = 'Read https://example.org/a now';
    const entities = {
      urls: [
        { url: 'https://t.co/abc', expanded_url: 'https://example.org/a' },
        { url: 'https://t.co/pic', expanded_url: 'https://x.com/i/1/photo/1', media_key: '3_1' },
      ],
    };
    const { result } = await run(
      'verify',
      [
        timeline([
          post(POST_ID, 'Read https://t.co/abc now https://t.co/pic', SENT_AT, { entities }),
        ]),
      ],
      { state, items: [mainItem(sent, [photo('m1')])] },
    );
    expect(result).toMatchObject({ kind: 'found', remoteId: POST_ID });
  });

  it('matches a link typed without a scheme', async () => {
    const entities = { urls: [{ url: 'https://t.co/abc', expanded_url: 'http://example.com' }] };
    const { result } = await run(
      'verify',
      [timeline([post(POST_ID, 'Read https://t.co/abc', SENT_AT, { entities })])],
      { state, items: [mainItem('Read example.com')] },
    );
    expect(result).toMatchObject({ kind: 'found', remoteId: POST_ID });
  });

  it('matches the text whether or not X HTML-escapes it', async () => {
    const raw = 'use &amp; in HTML';
    const { result } = await run('verify', [timeline([post(POST_ID, raw)])], {
      state,
      items: [mainItem(raw)],
    });
    expect(result).toMatchObject({ kind: 'found', remoteId: POST_ID });
  });

  it('reads back the HTML-escaped text X returns', async () => {
    const { result } = await run(
      'verify',
      [timeline([post(POST_ID, 'Tom &amp; Jerry &lt;3 &amp;lt;b&amp;gt;')])],
      { state, items: [mainItem('Tom & Jerry <3 &lt;b&gt;')] },
    );
    expect(result).toMatchObject({ kind: 'found', remoteId: POST_ID });
  });

  it('matches a reply only under its parent', async () => {
    const options = {
      state,
      items: [{ position: 1, role: 'thread' as const, text: 'Part two', media: [] }],
      chain: [{ position: 0, role: 'main' as const, remoteId: PARENT }],
    };
    const reply = (id: string, parent: string) =>
      post(id, 'Part two', SENT_AT, { referenced_tweets: [{ type: 'replied_to', id: parent }] });
    const { result } = await run(
      'verify',
      [timeline([reply('7', PARENT), reply('8', '42'), post('9', 'Part two')])],
      options,
    );
    expect(result).toMatchObject({ kind: 'found', remoteId: '7' });
  });

  it('needs the send time before it reads anything', async () => {
    const { result, calls } = await run('verify', []);
    expect(result).toEqual({ kind: 'inconclusive' });
    expect(calls).toEqual([]);
  });
});
