import type { Database } from '@kronaut/db';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { pino } from 'pino';
import { describe, expect, it } from 'vitest';
import type { RouteReply } from '../../base/http/request.ts';
import { createTestInstance } from '../../base/http/testing.ts';
import { catalog } from './catalog.ts';
import { mcpServer } from './server.ts';

const unusedDb: Database = {
  withTenant: () => Promise.reject(new Error('database not available in unit tests')),
  withActor: () => Promise.reject(new Error('database not available in unit tests')),
  sweeps: {} as Database['sweeps'],
  destroy: () => Promise.resolve(),
};

const tools = catalog(createTestInstance({ db: unusedDb }).routes.map((bound) => bound.route));

const BRANDS = { items: [{ id: 'brand_a', name: 'Acme', slug: 'acme', archivedAt: null }] };

async function connected(reply: (routeId: string) => RouteReply): Promise<Client> {
  const server = mcpServer({
    tools,
    allows: () => true,
    invoke: () => async (routeId) => reply(routeId),
    grantId: null,
    requestId: 'test-request',
    logger: pino({ level: 'silent' }),
  });
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await server.connect(serverSide);
  const client = new Client({ name: 'test', version: '1' });
  await client.connect(clientSide);
  return client;
}

function doc(text: string) {
  return { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text }] }] };
}

const channel = (id: string, brandId: string | null, signature: string | null) => ({
  id,
  provider: 'bluesky',
  displayName: `Name ${id}`,
  brandId,
  signature: signature === null ? null : { id: signature, name: 'Sig', doc: doc('sig') },
});

const PARTS: Readonly<Record<string, unknown>> = {
  'brands.list': BRANDS,
  'channels.list': {
    items: [channel('ch_1', 'brand_a', 'st_sig'), channel('ch_2', 'brand_a', null)],
  },
  'saved_texts.list': {
    items: [
      { id: 'st_sig', name: 'Sig', doc: doc('Cheers'), channelCount: 1 },
      { id: 'st_tpl', name: 'Tpl', doc: doc('Hello'), channelCount: 0 },
      { id: 'st_other', name: 'Other', doc: doc('Elsewhere'), channelCount: 2 },
    ],
  },
};

const forbidden: RouteReply = {
  status: 403,
  body: {
    error: { code: 'forbidden', message: 'No.', details: [{ path: 'a', code: 'scope_missing' }] },
  },
  replayed: false,
};

describe('mcp tools/list', () => {
  it('matches the committed contract', async () => {
    const client = await connected(() => forbidden);
    const listed = await client.listTools();
    expect(listed.tools.map((tool) => tool.name)).toHaveLength(13);
    expect(listed).toMatchSnapshot();
  });

  it('marks the read, destructive and idempotent tools', async () => {
    const client = await connected(() => forbidden);
    const { tools: listed } = await client.listTools();
    const hinted = (hint: 'readOnlyHint' | 'destructiveHint' | 'idempotentHint') =>
      listed.filter((tool) => tool.annotations?.[hint] === true).map((tool) => tool.name);
    expect(hinted('readOnlyHint')).toHaveLength(7);
    expect(hinted('destructiveHint')).toEqual(['cancel_scheduled_post']);
    expect(hinted('idempotentHint')).toEqual([
      'draft_campaign',
      'update_draft',
      'add_media_from_url',
      'request_approval',
      'schedule_approved_post',
    ]);
  });

  it('lists each brand with its channels, signatures and the templates', async () => {
    const client = await connected((routeId) => ({
      status: 200,
      body: PARTS[routeId],
      replayed: false,
    }));
    const result = await client.callTool({ name: 'get_brand_context', arguments: {} });
    const text = (value: string, source: string) => ({ untrusted: true, source, text: value });
    expect(result.structuredContent).toEqual({
      brands: [
        {
          id: 'brand_a',
          name: 'Acme',
          channels: [
            { id: 'ch_1', provider: 'bluesky', displayName: text('Name ch_1', 'provider') },
            { id: 'ch_2', provider: 'bluesky', displayName: text('Name ch_2', 'provider') },
          ],
          savedTexts: [
            { id: 'st_sig', kind: 'signature', text: text('Cheers', 'post'), channelIds: ['ch_1'] },
            { id: 'st_tpl', kind: 'template', text: text('Hello', 'post'), channelIds: [] },
          ],
        },
      ],
      omitted: [],
    });
  });

  it('leaves out the brand context parts the key may not read', async () => {
    const client = await connected((routeId) =>
      routeId === 'brands.list' ? { status: 200, body: BRANDS, replayed: false } : forbidden,
    );
    const result = await client.callTool({ name: 'get_brand_context', arguments: {} });
    expect(result.structuredContent).toEqual({
      brands: [{ id: 'brand_a', name: 'Acme' }],
      omitted: ['channels', 'savedTexts'],
    });
  });
});
