import { createApiClient } from '@kronaut/sdk';
import { describe, expect, it } from 'vitest';
import type { Post } from '../api.ts';
import { EMPTY_DOC } from './doc.ts';
import { formFingerprint } from './draft-body.ts';
import { type ComposeInput, type ComposeWhen, createSubmitter } from './submit.ts';
import { SubmitError } from './submit-error.ts';

const POST_PATH = '/v1/workspaces/ws_1/posts/post_1';
const WHEN: ComposeWhen = { mode: 'asap' };

interface Sent {
  readonly line: string;
  readonly body: Record<string, unknown>;
}

type Stub = (sent: Sent) => Response | undefined;

function opened(state: string, version = 3) {
  const destination = { accountId: 'acct_a', variant: null, state };
  return { id: 'post_1', version, publishSummary: 'draft', destinations: [destination] };
}

const asPost = (value: unknown) => value as Post;

function conflict() {
  const error = { code: 'version_conflict', message: 'changed' };
  return Response.json({ error }, { status: 409 });
}

function input(text: string, extra: Partial<ComposeInput> = {}): ComposeInput {
  const paragraph = { type: 'paragraph' as const, content: [{ type: 'text' as const, text }] };
  return {
    content: {
      doc: { type: 'doc', content: [paragraph] },
      images: [{ id: 'm1', file: null, altText: '', aiGenerated: false }],
      video: null,
      replies: [],
      comment: null,
    },
    variants: [],
    destinations: [
      {
        accountId: 'acct_a',
        publishType: 'post',
        variant: null,
        settings: { reel: true },
        deliveryMode: 'reminder',
      },
    ],
    when: WHEN,
    request: null,
    ...extra,
  };
}

function harness(state: string, stub: Stub = () => undefined) {
  const sent: Sent[] = [];
  const client = createApiClient({
    baseUrl: 'http://kronaut.test',
    fetch: async (raw) => {
      const request = raw as Request;
      const text = request.method === 'GET' ? '' : await request.text();
      const path = new URL(request.url).pathname;
      const call = {
        line: `${request.method} ${path}`,
        body: (text === '' ? {} : JSON.parse(text)) as Record<string, unknown>,
      };
      sent.push(call);
      const replaced = stub(call);
      if (replaced !== undefined) return replaced;
      if (path.endsWith('/unschedule')) return Response.json(opened('draft', 4));
      if (path.endsWith('/schedule')) return Response.json(opened('scheduled', 9));
      return Response.json(opened('draft', 5));
    },
  });
  const fingerprint = formFingerprint(input('Hello'));
  const submit = createSubmitter(client, 'ws_1', { post: asPost(opened(state)), fingerprint });
  return { sent, submit, lines: () => sent.map((call) => call.line) };
}

describe('saving an opened post', () => {
  it('skips the PATCH when the content is unchanged', async () => {
    const { submit, lines } = harness('draft');
    await submit(input('Hello'));
    expect(lines()).toEqual([`POST ${POST_PATH}/schedule`]);
  });

  it('writes nothing for unchanged content kept as a draft', async () => {
    const { submit, lines } = harness('draft');
    await submit(input('Hello', { when: { mode: 'draft' } }));
    expect(lines()).toEqual([]);
  });

  it('sends a canceled post through a PATCH even when unchanged, to revive it', async () => {
    const { submit, lines } = harness('canceled');
    await submit(input('Hello'));
    expect(lines()).toEqual([`PATCH ${POST_PATH}`, `POST ${POST_PATH}/schedule`]);
  });

  it('unschedules, patches and schedules a scheduled post in order, on the right versions', async () => {
    const { submit, sent } = harness('scheduled');
    await submit(input('Edited'));
    expect(sent.map((call) => [call.line, call.body.expectedVersion])).toEqual([
      [`POST ${POST_PATH}/unschedule`, 3],
      [`PATCH ${POST_PATH}`, 4],
      [`POST ${POST_PATH}/schedule`, 5],
    ]);
  });

  it('stops a scheduled post kept as a draft after the PATCH', async () => {
    const { submit, lines } = harness('scheduled');
    await submit(input('Edited', { when: { mode: 'draft' } }));
    expect(lines()).toEqual([`POST ${POST_PATH}/unschedule`, `PATCH ${POST_PATH}`]);
  });

  it('keeps the settings and delivery mode on the PATCH', async () => {
    const { submit, sent } = harness('draft');
    await submit(input('Edited'));
    expect(sent[0]?.body).toMatchObject({
      destinations: [{ accountId: 'acct_a', settings: { reel: true }, deliveryMode: 'reminder' }],
      items: [{ media: [{ mediaId: 'm1' }] }],
    });
  });

  it('never retries a version conflict on the first write', async () => {
    const { submit, lines } = harness('draft', ({ line }) =>
      line.startsWith('PATCH') ? conflict() : undefined,
    );
    const error = await submit(input('Edited')).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(SubmitError);
    expect(error).toMatchObject({ step: 'update', cause: { code: 'version_conflict' } });
    expect(lines()).toEqual([`PATCH ${POST_PATH}`]);
  });

  it('never retries a version conflict on the unschedule', async () => {
    const { submit, lines } = harness('scheduled', ({ line }) =>
      line.endsWith('/unschedule') ? conflict() : undefined,
    );
    const error = await submit(input('Edited')).catch((caught: unknown) => caught);
    expect(error).toMatchObject({ step: 'unschedule', unscheduled: false });
    expect(lines()).toEqual([`POST ${POST_PATH}/unschedule`]);
  });

  it('continues from the draft after a failure, without unscheduling twice', async () => {
    let failing = true;
    const { submit, sent, lines } = harness('scheduled', ({ line }) => {
      if (!line.startsWith('PATCH') || !failing) return undefined;
      failing = false;
      return Response.json({ error: { code: 'unprocessable', message: '' } }, { status: 422 });
    });
    const error = await submit(input('Edited')).catch((caught: unknown) => caught);
    expect(error).toMatchObject({ step: 'update', unscheduled: true });

    await submit(input('Edited'));
    expect(lines()).toEqual([
      `POST ${POST_PATH}/unschedule`,
      `PATCH ${POST_PATH}`,
      `PATCH ${POST_PATH}`,
      `POST ${POST_PATH}/schedule`,
    ]);
    expect(sent[2]?.body.expectedVersion).toBe(4);
  });
});

describe('saving a new post', () => {
  it('keeps the single retry of a version conflict', async () => {
    let patches = 0;
    const client = createApiClient({
      baseUrl: 'http://kronaut.test',
      fetch: async (raw) => {
        const { method, url } = raw as Request;
        const path = new URL(url).pathname;
        if (method === 'POST' && path.endsWith('/posts')) {
          return Response.json(opened('draft', 1), { status: 201 });
        }
        if (method === 'PATCH') {
          patches += 1;
          return patches === 1 ? conflict() : Response.json(opened('draft', 7));
        }
        if (method === 'GET') return Response.json(opened('draft', 6));
        return Response.json({ error: { code: 'unavailable', message: '' } }, { status: 503 });
      },
    });
    const submit = createSubmitter(client, 'ws_1');
    const first = input('One', { when: { mode: 'draft' } });
    await submit(first);
    await submit({ ...first, content: { ...first.content, doc: EMPTY_DOC } });
    expect(patches).toBe(2);
  });
});
