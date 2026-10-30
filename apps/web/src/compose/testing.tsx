import { createApiClient } from '@kronaut/sdk';
import { createMemoryHistory } from '@tanstack/react-router';
import { fireEvent, render } from '@testing-library/react';
import { App, createApp } from '../app.tsx';
import { docParagraphs, textToParagraphs, toDoc } from './doc.ts';
import type { PostEditorProps } from './editor.tsx';

export function MockEditor({ id, label, initial, onChange }: PostEditorProps) {
  return (
    <textarea
      id={id}
      aria-label={label}
      defaultValue={
        initial === undefined
          ? ''
          : docParagraphs(initial)
              .map((p) => p.text)
              .join('\n')
      }
      onChange={(event) =>
        onChange(toDoc({ type: 'doc', content: textToParagraphs(event.currentTarget.value) }))
      }
    />
  );
}

export function jpeg(name: string, bytes = 4): File {
  return new File([new Uint8Array(bytes)], name, { type: 'image/jpeg' });
}

export function pickFiles(files: readonly File[]): void {
  const input = document.querySelector<HTMLInputElement>('input[type=file]');
  if (input === null) throw new Error('no file input');
  Object.defineProperty(input, 'files', { value: files, configurable: true });
  fireEvent.change(input);
}

export const ME = {
  user: { id: 'usr_1', displayName: 'Ada', email: 'ada@example.test', locale: 'en' },
  workspaces: [{ id: 'ws_1', name: 'Studio', role: 'owner', canApprove: true }],
};

export const BLUESKY_TEXT = [
  { counting: 'graphemes', max: 300 },
  { counting: 'utf8-bytes', max: 3000 },
];
export const RULES: Record<string, unknown[]> = {
  bluesky: [{ id: 'post', text: BLUESKY_TEXT, maxLinks: null, imageAspect: null, video: null }],
  threads: [
    {
      id: 'post',
      text: [{ counting: 'threads', max: 500 }],
      maxLinks: 5,
      imageAspect: null,
      video: null,
    },
  ],
};

const PREVIEWS: Record<string, string> = {
  bluesky: 'short-feed',
  facebook: 'pro-feed',
  instagram: 'media-grid',
  linkedin: 'pro-feed',
  mastodon: 'short-feed',
  threads: 'short-feed',
};

export function channel(id: string, provider: string, displayName: string) {
  return {
    id,
    provider,
    accountKind: 'profile',
    handle: null,
    displayName,
    profileUrl: null,
    status: 'active',
    statusReason: null,
    accessExpiresAt: null,
    connectedAt: '2026-10-01T08:00:00.000Z',
    lastErrorCode: null,
    postTypes: RULES[provider] ?? [],
    preview: PREVIEWS[provider] ?? 'short-feed',
  };
}

export const CHANNELS = [
  channel('acct_bsky', 'bluesky', 'Ada on Bluesky'),
  channel('acct_ig', 'instagram', 'Ada on Instagram'),
];

export const MEDIA_ID = 'media_01jbcdefghjkmnpqrstvwxyz01';

export function post(summary: string, state: string) {
  return {
    id: 'post_1',
    version: summary === 'draft' ? 1 : 2,
    title: null,
    scheduleMode: summary === 'draft' ? 'unscheduled' : 'asap',
    scheduleLocal: null,
    scheduleTz: null,
    tags: [],
    publishSummary: summary,
    items: [{ position: 0, role: 'main', doc: {}, media: [] }],
    destinations: CHANNELS.map((c, index) => ({
      id: `destination_${index}`,
      accountId: c.id,
      provider: c.provider,
      publishType: c.provider === 'bluesky' ? 'post' : 'image',
      deliveryMode: 'auto',
      settings: {},
      state,
      stateReason: null,
      version: 1,
      scheduledAt: null,
      remoteUrl: null,
      publishedAt: null,
      lastErrorCode: null,
    })),
    createdAt: '2026-10-24T08:00:00.000Z',
    updatedAt: '2026-10-24T08:00:00.000Z',
  };
}

export interface Call {
  readonly method: string;
  readonly path: string;
  readonly key: string | null;
  readonly body: unknown;
}

export type Override = (call: Call, count: number) => Response | undefined;

export function policy(mode: 'none' | 'required') {
  const values = {
    mode,
    requiredApprovals: 1,
    allowSelfApproval: false,
    rescheduleToleranceMin: 0,
  };
  return { workspace: null, brands: [], effective: values };
}

export const MEDIA_ASSET = {
  id: MEDIA_ID,
  kind: 'image',
  mime: 'image/jpeg',
  bytes: 4,
  width: 1,
  height: 1,
  sha256: null,
  state: 'ready',
  aiGenerated: false,
};

export function defaultResponse(path: string): Response {
  if (path === '/v1/me') return Response.json(ME);
  if (path === '/v1/workspaces/ws_1/approval-policy') return Response.json(policy('none'));
  if (path === '/v1/workspaces/ws_1/channels') return Response.json({ items: CHANNELS });
  if (path === '/v1/workspaces/ws_1/media') return Response.json(MEDIA_ASSET, { status: 201 });
  if (path === '/v1/workspaces/ws_1/tags') return Response.json({ items: [] });
  if (path === '/v1/workspaces/ws_1/posts') {
    return Response.json(post('draft', 'draft'), { status: 201 });
  }
  if (path === '/v1/workspaces/ws_1/posts/post_1/schedule') {
    return Response.json(post('scheduled', 'scheduled'));
  }
  if (path === '/v1/workspaces/ws_1/posts/post_1') {
    return Response.json(post('scheduled', 'scheduled'));
  }
  return Response.json({ error: { code: 'not_found', message: '' } }, { status: 404 });
}

async function readBody(request: Request): Promise<unknown> {
  if (request.method === 'GET') return null;
  const bytes = await request.arrayBuffer();
  if (bytes.byteLength === 0) return null;
  if (request.headers.get('content-type')?.includes('json')) {
    return JSON.parse(new TextDecoder().decode(bytes));
  }
  return { bytes: bytes.byteLength };
}

export function mount(override: Override = () => undefined, url = '/compose') {
  const calls: Call[] = [];
  const client = createApiClient({
    baseUrl: 'http://kronaut.test',
    fetch: async (input) => {
      const request = input as Request;
      const path = new URL(request.url).pathname;
      const call = {
        method: request.method,
        path,
        key: request.headers.get('Idempotency-Key'),
        body: await readBody(request),
      };
      calls.push(call);
      const replaced = override(call, calls.filter((c) => c.path === path).length);
      if (replaced !== undefined) return replaced;
      return defaultResponse(path);
    },
  });
  const { router, queryClient } = createApp(client, createMemoryHistory({ initialEntries: [url] }));
  render(<App router={router} queryClient={queryClient} client={client} />);
  return { router, queryClient, calls, mutations: () => calls.filter((c) => c.method !== 'GET') };
}
