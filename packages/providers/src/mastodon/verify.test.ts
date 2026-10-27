import type { ProviderState, PublishItem, VerifyOutcome } from '@kronaut/core';
import { describe, expect, it } from 'vitest';
import {
  type ScriptedExchange,
  scriptedHttp,
  TEST_NOW,
  testPublishContext,
} from '../_kit/testing.ts';
import { mastodonRuntime } from './runtime.ts';
import { cat, dog, failureOf, input, main, ORIGIN, SENT_AT, TOKEN } from './testing.ts';
import { comparable, plainContent } from './verify.ts';

const RECENT = `${ORIGIN}/api/v1/accounts/109876543210/statuses?limit=40&exclude_reblogs=true`;
const URL_1 = `${ORIGIN}/@alice/113000000000000001`;
const sent = {
  media: { m1: { id: '201', ready: true }, m2: { id: '202', ready: true } },
  sentAt: SENT_AT,
};

function status(id: string, minutesAfterSend: number, extra: Record<string, unknown> = {}) {
  return {
    id,
    created_at: TEST_NOW.add({ seconds: minutesAfterSend * 60 }).toString(),
    url: `${ORIGIN}/@alice/${id}`,
    content: '<p>Other</p>',
    media_attachments: [],
    ...extra,
  };
}

const recent = (json: unknown, status = 200): ScriptedExchange => ({ url: RECENT, status, json });

function verify(
  script: ScriptedExchange[],
  items: readonly PublishItem[],
  state: ProviderState,
  minutes = 1,
) {
  const http = scriptedHttp(script);
  const { ctx } = testPublishContext(http, {}, TEST_NOW.add({ minutes }));
  if (mastodonRuntime.verify === undefined) throw new Error('mastodon verifies');
  const outcome = mastodonRuntime.verify(ctx, input(items, state));
  return { http, outcome };
}

async function settled(
  script: ScriptedExchange[],
  items: readonly PublishItem[],
  state: ProviderState = sent,
  minutes = 1,
): Promise<VerifyOutcome> {
  const { http, outcome } = verify(script, items, state, minutes);
  const result = await outcome;
  http.assertDone();
  expect(http.calls.every((call) => call.method === 'GET')).toBe(true);
  return result;
}

describe('mastodon verify', () => {
  it('finds the status whose attachments are the checkpointed media ids, in any order', async () => {
    const list = [
      status('113000000000000003', 0, { media_attachments: [{ id: '201' }] }),
      status('113000000000000001', 0, { media_attachments: [{ id: '202' }, { id: '201' }] }),
      status('112000000000000000', -30),
    ];
    const result = await settled([recent(list)], [main('Pets', [cat, dog])]);
    expect(result).toEqual({ kind: 'found', remoteId: '113000000000000001', url: URL_1 });
  });

  it('matches a text-only post on its plain text, mentions shortened to the username', async () => {
    const content =
      '<p>Hi <span class="h-card"><a href="https://other.example/@bob" class="u-url mention">@<span>bob</span></a></span> &amp; all</p><p>Line&#39;s two</p>';
    const list = [status('113000000000000001', 0, { content })];
    const result = await settled(
      [recent(list)],
      [main("Hi @bob@other.example & all\n\nLine's two")],
      { sentAt: SENT_AT },
    );
    expect(result).toEqual({ kind: 'found', remoteId: '113000000000000001', url: URL_1 });
  });

  it('is absent when the list reaches back past the send without a match', async () => {
    const list = [status('113000000000000002', 0), status('112000000000000000', -10)];
    expect(await settled([recent(list)], [main('Pets', [cat, dog])])).toEqual({ kind: 'absent' });
    expect(await settled([recent([])], [main('Hi')], { sentAt: SENT_AT })).toEqual({
      kind: 'absent',
    });
  });

  it('is inconclusive when a full page never reaches back to the send', async () => {
    const list = Array.from({ length: 40 }, (_, n) => status(`11300000000000${1000 + n}`, 0));
    expect(await settled([recent(list)], [main('Pets', [cat, dog])])).toEqual({
      kind: 'inconclusive',
    });
  });

  it('counts statuses from two minutes before the send for clock skew', async () => {
    const list = [status('113000000000000001', -1.5, { content: '<p>Hi</p>' })];
    expect(await settled([recent(list)], [main('Hi')], { sentAt: SENT_AT })).toMatchObject({
      kind: 'found',
    });
    const old = [status('113000000000000001', -3, { content: '<p>Hi</p>' })];
    expect(await settled([recent(old)], [main('Hi')], { sentAt: SENT_AT })).toEqual({
      kind: 'absent',
    });
  });

  it('is inconclusive past an hour since the send, without calling the server', async () => {
    expect(await settled([], [main('Hi')], { sentAt: SENT_AT }, 61)).toEqual({
      kind: 'inconclusive',
    });
    expect(await settled([], [main('Hi')], {})).toEqual({ kind: 'inconclusive' });
  });

  it('returns a checkpointed status without calling the server', async () => {
    const state = { ...sent, status: { id: '113000000000000001', url: URL_1 } };
    expect(await settled([], [main('Pets', [cat, dog])], state)).toEqual({
      kind: 'found',
      remoteId: '113000000000000001',
      url: URL_1,
    });
  });

  it('is inconclusive on 5xx and 403, and reports a revoked token on 401', async () => {
    expect(await settled([recent({}, 503)], [main('Hi')], { sentAt: SENT_AT })).toEqual({
      kind: 'inconclusive',
    });
    expect(await settled([recent({}, 403)], [main('Hi')], { sentAt: SENT_AT })).toEqual({
      kind: 'inconclusive',
    });
    const { http, outcome } = verify([recent({}, 401)], [main('Hi')], { sentAt: SENT_AT });
    expect(await failureOf(outcome)).toEqual({ kind: 'auth_revoked' });
    expect(http.calls[0]?.headers.authorization).toBe(`Bearer ${TOKEN}`);
  });
});

describe('mastodon status text', () => {
  it('strips HTML to plain text and compares on normalised whitespace and NFC', () => {
    expect(plainContent('<p>a<br>b<br />c</p><p>&lt;tag&gt; &#x1F600; &unknown;</p>')).toBe(
      'a\nb\nc\n\n<tag> \u{1F600} &unknown;\n\n',
    );
    expect(comparable(' Café \n\n x ')).toBe('Café x');
    expect(comparable('@alice@social.example.org hi')).toBe('@alice hi');
  });
});
