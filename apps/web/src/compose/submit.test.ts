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
  return { id: 'post_1', version, publishSummary: 'draft', destinations: [destination], tags: [] };
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
    tags: [],
    ...extra,
  };
}

function stubbed(stub: Stub) {
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
  return { client, sent };
}

function harness(state: string, stub: Stub = () => undefined, fields: object = {}) {
  const { client, sent } = stubbed(stub);
  const fingerprint = formFingerprint(input('Hello'));
  const post = asPost({ ...opened(state), ...fields });
  const submit = createSubmitter(client, 'ws_1', { post, fingerprint });
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

describe('saving next to a canceled destination', () => {
  const canceled = { accountId: 'acct_b', variant: null, state: 'canceled' };
  const mixed = { destinations: [opened('draft').destinations[0], canceled] };
  const own = input('Hello').destinations;
  const ticked = [...own, { accountId: 'acct_b', publishType: 'post', variant: null }];

  it('leaves it canceled while nothing changed, on Keep as draft too', async () => {
    const { submit, lines } = harness('draft', undefined, mixed);
    await submit(input('Hello', { when: { mode: 'draft' } }));
    expect(lines()).toEqual([]);
    await submit(input('Hello'));
    expect(lines()).toEqual([`POST ${POST_PATH}/schedule`]);
  });

  it('removes it with a changed save', async () => {
    const { submit, sent } = harness('draft', undefined, mixed);
    await submit(input('Edited', { when: { mode: 'draft' } }));
    expect(sent.map((call) => call.line)).toEqual([`PATCH ${POST_PATH}`]);
    expect(sent[0]?.body.destinations).toMatchObject([{ accountId: 'acct_a' }]);
  });

  it('brings it back when ticked', async () => {
    const { submit, sent } = harness('draft', undefined, mixed);
    await submit(input('Hello', { destinations: ticked, when: { mode: 'draft' } }));
    expect(sent.map((call) => call.line)).toEqual([`PATCH ${POST_PATH}`]);
    expect(sent[0]?.body.destinations).toMatchObject([
      { accountId: 'acct_a' },
      { accountId: 'acct_b' },
    ]);
  });
});

describe('changing only the time of a scheduled post', () => {
  const FIXED = {
    scheduleMode: 'instant',
    scheduleLocal: '2999-03-01T09:30:00',
    scheduleTz: 'Europe/Vienna',
  };
  const at = (scheduleLocal: string): ComposeWhen => ({
    mode: 'instant',
    scheduleLocal,
    scheduleTz: 'Europe/Vienna',
  });
  const moved = at('2999-03-02T10:45');
  const note = { note: 'please' };
  const outside = () => {
    const details = [{ path: 'body.scheduleLocal', code: 'outside_approved_schedule' }];
    const error = { code: 'unprocessable', message: '', details };
    return Response.json({ error }, { status: 422 });
  };
  const refusing = ({ line }: Sent) => (line.endsWith('/reschedule') ? outside() : undefined);

  it('writes nothing when nothing changed', async () => {
    const { submit, lines } = harness('scheduled', undefined, FIXED);
    await submit(input('Hello', { when: at('2999-03-01T09:30') }));
    expect(lines()).toEqual([]);
  });

  it('writes nothing for an unchanged queue post', async () => {
    const queued = { scheduleMode: 'local_per_destination' };
    const { submit, lines } = harness('scheduled', undefined, queued);
    await submit(input('Hello', { when: { mode: 'queue' } }));
    expect(lines()).toEqual([]);
  });

  it('reschedules without unscheduling or requesting approval', async () => {
    const { submit, sent } = harness('scheduled', undefined, FIXED);
    await submit(input('Hello', { when: moved, request: note }));
    expect(sent).toEqual([
      {
        line: `POST ${POST_PATH}/reschedule`,
        body: {
          expectedVersion: 3,
          scheduleLocal: '2999-03-02T10:45',
          scheduleTz: 'Europe/Vienna',
        },
      },
    ]);
  });

  it('reschedules a queue post given a fixed time', async () => {
    const queued = { scheduleMode: 'local_per_destination' };
    const { submit, lines } = harness('scheduled', undefined, queued);
    await submit(input('Hello', { when: moved }));
    expect(lines()).toEqual([`POST ${POST_PATH}/reschedule`]);
  });

  it('keeps the unschedule flow when the content changed too', async () => {
    const { submit, lines } = harness('scheduled', undefined, FIXED);
    await submit(input('Edited', { when: moved }));
    expect(lines()).toEqual([
      `POST ${POST_PATH}/unschedule`,
      `PATCH ${POST_PATH}`,
      `POST ${POST_PATH}/schedule`,
    ]);
  });

  it('surfaces a time outside the approved schedule, then runs the request from there', async () => {
    const { submit, lines } = harness('scheduled', refusing, FIXED);
    const error = await submit(input('Hello', { when: moved })).catch((caught: unknown) => caught);
    expect(error).toMatchObject({ step: 'schedule', unscheduled: false });
    expect(lines()).toEqual([`POST ${POST_PATH}/reschedule`]);

    await submit(input('Hello', { when: moved, request: note }));
    expect(lines().slice(1)).toEqual([
      `POST ${POST_PATH}/unschedule`,
      `POST ${POST_PATH}/approval-requests`,
    ]);
  });

  it('tries a reschedule again for a different time', async () => {
    const { submit, lines } = harness('scheduled', refusing, FIXED);
    await submit(input('Hello', { when: moved })).catch(() => undefined);
    const later = at('2999-03-03T10:45');
    await submit(input('Hello', { when: later, request: note })).catch(() => undefined);
    expect(lines()).toEqual([`POST ${POST_PATH}/reschedule`, `POST ${POST_PATH}/reschedule`]);
  });
});

describe('keeping a draft after a schedule that may have committed', () => {
  const timedOut = () =>
    Response.json({ error: { code: 'unavailable', message: '' } }, { status: 503 });

  it('reads the post first and unschedules what committed', async () => {
    const { submit, sent, lines } = harness('draft', ({ line }) => {
      if (line.endsWith('/schedule')) return timedOut();
      return line.startsWith('GET') ? Response.json(opened('scheduled', 9)) : undefined;
    });
    await submit(input('Hello')).catch(() => undefined);
    await submit(input('Hello', { when: { mode: 'draft' } }));
    expect(lines()).toEqual([
      `POST ${POST_PATH}/schedule`,
      `GET ${POST_PATH}`,
      `POST ${POST_PATH}/unschedule`,
    ]);
    expect(sent[2]?.body.expectedVersion).toBe(9);
  });

  it('reads only once, and not at all without a pending schedule', async () => {
    const { submit, lines } = harness('draft', ({ line }) =>
      line.endsWith('/schedule') ? timedOut() : undefined,
    );
    await submit(input('Hello', { when: { mode: 'draft' } }));
    expect(lines()).toEqual([]);
    await submit(input('Hello')).catch(() => undefined);
    await submit(input('Hello', { when: { mode: 'draft' } }));
    await submit(input('Hello', { when: { mode: 'draft' } }));
    expect(lines()).toEqual([`POST ${POST_PATH}/schedule`, `GET ${POST_PATH}`]);
  });
});

describe('saving tags', () => {
  const ADA = { id: 'tag_1', name: 'Ada', color: 'teal' };
  const LOVELACE = { id: 'tag_2', name: 'Lovelace', color: 'red' };
  const tagged = { tags: [ADA] };
  const TAGS_PATH = `PUT ${POST_PATH}/tags`;
  const tagsDown = ({ line }: Sent) =>
    line === TAGS_PATH
      ? Response.json({ error: { code: 'unavailable', message: '' } }, { status: 503 })
      : undefined;

  function newPost(stub: Stub) {
    const { client, sent } = stubbed(stub);
    return {
      submit: createSubmitter(client, 'ws_1'),
      lines: () => sent.map((call) => call.line),
    };
  }

  it('stops a new post before scheduling when they fail, and finishes it on the next save', async () => {
    let failing = true;
    const { submit, lines } = newPost((sent) => (failing ? tagsDown(sent) : undefined));
    const form = input('Hello', { tags: ['tag_1'] });
    const error = await submit(form).catch((caught: unknown) => caught);
    expect(error).toMatchObject({ step: 'tags_unscheduled' });
    expect(lines()).toEqual(['POST /v1/workspaces/ws_1/posts', TAGS_PATH]);

    failing = false;
    await submit(form);
    expect(lines().slice(2)).toEqual([TAGS_PATH, `POST ${POST_PATH}/schedule`]);
  });

  it('says only the tags failed on a new draft', async () => {
    const { submit } = newPost(tagsDown);
    const form = input('Hello', { tags: ['tag_1'], when: { mode: 'draft' } });
    const error = await submit(form).catch((caught: unknown) => caught);
    expect(error).toMatchObject({ step: 'tags' });
  });

  it('saves them first on a scheduled post, and leaves the schedule alone when they fail', async () => {
    const { submit, lines } = harness('scheduled', tagsDown, tagged);
    const form = input('Edited', { tags: ['tag_2'] });
    const error = await submit(form).catch((caught: unknown) => caught);
    expect(error).toMatchObject({ step: 'tags_opened', unscheduled: false });
    expect(lines()).toEqual([TAGS_PATH]);
  });

  it('runs before the other steps of an opened post', async () => {
    const { submit, lines } = harness('scheduled', undefined, tagged);
    await submit(input('Edited', { tags: ['tag_2'] }));
    expect(lines()).toEqual([
      TAGS_PATH,
      `POST ${POST_PATH}/unschedule`,
      `PATCH ${POST_PATH}`,
      `POST ${POST_PATH}/schedule`,
    ]);
  });

  it('leaves tags alone that changed on the server but not in the form', async () => {
    const both = { ...opened('draft', 5), tags: [ADA, LOVELACE] };
    const { submit, lines } = harness(
      'draft',
      ({ line }) => (line.startsWith('PATCH') ? Response.json(both) : undefined),
      tagged,
    );
    await submit(input('Edited', { tags: ['tag_1'] }));
    expect(lines()).toEqual([`PATCH ${POST_PATH}`, `POST ${POST_PATH}/schedule`]);
  });

  it('sends a change once, whatever the next save does', async () => {
    const { submit, lines } = harness('draft', ({ line }) =>
      line.endsWith('/schedule')
        ? Response.json({ error: { code: 'unavailable', message: '' } }, { status: 503 })
        : undefined,
    );
    const form = input('Hello', { tags: ['tag_1'] });
    await submit(form).catch(() => undefined);
    await submit(form).catch(() => undefined);
    expect(lines().filter((line) => line === TAGS_PATH)).toHaveLength(1);
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
