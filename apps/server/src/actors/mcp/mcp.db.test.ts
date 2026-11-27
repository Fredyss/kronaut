import { randomBytes, randomUUID } from 'node:crypto';
import { decodePublicId, encodePublicId } from '@kronaut/core';
import { startTestDatabase, type TestDatabase } from '@kronaut/db/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { provisionTestWorkspace, requestAs } from '../../base/http/testing.ts';
import type { PostDto } from '../../flow/posts/read/dto.ts';
import {
  type Auth,
  accountA,
  accountB,
  app,
  BASE,
  CLI,
  call,
  create,
  db,
  draft,
  errorOf,
  inMinutes,
  insertAccount,
  insertGrant,
  keyring,
  owner,
  ownerAuth,
  ownerId,
  startPosts,
  stopPosts,
  TZ,
  workspaceId,
} from '../../flow/posts/testing.ts';
import { saveCredential } from '../../infrastructure/credentials/credential-store.ts';

const ALL_SCOPES = [
  'brands:read',
  'channels:read',
  'groups:read',
  'posts:read',
  'posts:draft',
  'posts:submit',
  'posts:schedule',
  'posts:cancel',
  'media:read',
  'media:write',
  'analytics:read',
];

interface ToolResult {
  readonly isError?: boolean;
  readonly structuredContent: Record<string, unknown>;
  readonly content: readonly { readonly text: string }[];
}

let test: TestDatabase;
let agent: Auth;
let otherWorkspace: string;
let foreignPost: PostDto;
let serial = 0;

function mcpUrl(ws: string = workspaceId): string {
  return `${BASE}/v1/workspaces/${encodePublicId('workspace', ws)}/mcp`;
}

function headersFor(auth: Auth): Record<string, string> {
  const credential =
    'bearer' in auth ? { authorization: `Bearer ${auth.bearer}` } : { cookie: auth.cookie };
  return {
    ...credential,
    accept: 'application/json, text/event-stream',
    'content-type': 'application/json',
    'mcp-protocol-version': '2025-06-18',
  };
}

function rpc(auth: Auth, method: string, params: object, extra: Record<string, string> = {}) {
  serial += 1;
  return app.request(mcpUrl(), {
    method: 'POST',
    headers: { ...headersFor(auth), ...extra },
    body: JSON.stringify({ jsonrpc: '2.0', id: serial, method, params }),
  });
}

async function listTools(auth: Auth): Promise<string[]> {
  const response = await rpc(auth, 'tools/list', {});
  expect(response.status).toBe(200);
  const body = (await response.json()) as { result: { tools: { name: string }[] } };
  return body.result.tools.map((tool) => tool.name);
}

async function callTool(auth: Auth, name: string, args: object): Promise<ToolResult> {
  const response = await rpc(auth, 'tools/call', { name, arguments: args });
  expect(response.status).toBe(200);
  const body = (await response.json()) as { result: ToolResult };
  return body.result;
}

function codeOf(result: ToolResult): string | undefined {
  return (result.structuredContent.error as { code?: string } | undefined)?.code;
}

beforeAll(async () => {
  test = await startTestDatabase();
  await startPosts(test);
  agent = await insertGrant({ scopes: ALL_SCOPES });
  otherWorkspace = await provisionTestWorkspace(db, ownerId, 'ws-mcp-other');
  const otherAccount = await insertAccount('Other', otherWorkspace);
  const response = await requestAs(app, ownerAuth, {
    method: 'POST',
    url: `${BASE}/v1/workspaces/${encodePublicId('workspace', otherWorkspace)}/posts`,
    body: draft(otherAccount),
  });
  expect(response.status).toBe(201);
  foreignPost = (await response.json()) as PostDto;
});

afterAll(async () => {
  await stopPosts();
  await test?.stop();
});

describe('mcp endpoint', () => {
  it('initializes without a session and accepts only an API key', async () => {
    const init = {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'test', version: '1' },
    };
    const response = await rpc(agent, 'initialize', init);
    expect(response.status).toBe(200);
    expect(response.headers.get('mcp-session-id')).toBeNull();
    expect((await rpc(ownerAuth, 'initialize', init)).status).toBe(401);
    const get = await app.request(mcpUrl(), { method: 'GET', headers: headersFor(agent) });
    expect(get.status).toBe(405);
  });

  it('refuses a foreign Origin and another workspace in the path', async () => {
    const foreign = await rpc(agent, 'tools/list', {}, { origin: 'https://evil.example.test' });
    expect(foreign.status).toBe(403);
    const other = await app.request(mcpUrl(otherWorkspace), {
      method: 'POST',
      headers: headersFor(agent),
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
    });
    expect(other.status).toBe(404);
  });

  it("lists only the tools the key's scopes allow, and refuses the others", async () => {
    expect(await listTools(agent)).toHaveLength(13);
    const reader = await insertGrant({ scopes: ['posts:read'] });
    expect((await listTools(reader)).sort()).toEqual([
      'get_publish_status',
      'preview_post',
      'validate_draft',
    ]);
    const hidden = await rpc(reader, 'tools/call', {
      name: 'draft_campaign',
      arguments: { body: draft(), idempotencyKey: randomUUID() },
    });
    expect(((await hidden.json()) as { error?: { code: number } }).error?.code).toBe(-32602);
  });
});

describe('mcp tools', () => {
  it("TEN-01: another workspace's post is not found", async () => {
    const result = await callTool(agent, 'get_publish_status', { postId: foreignPost.id });
    expect(result.isError).toBe(true);
    expect(codeOf(result)).toBe('not_found');
  });

  it("keeps a restricted key's resource access, with the same code as REST", async () => {
    const restricted = await insertGrant({ scopes: ['posts:read'], accounts: [accountA] });
    const post = await create(ownerAuth, draft(accountB));
    const result = await callTool(restricted, 'get_publish_status', { postId: post.id });
    expect(result.isError).toBe(true);
    const rest = await call('GET', `posts/${post.id}`, restricted);
    expect(codeOf(result)).toBe((await errorOf(rest)).code);
  });

  it('replays a starred tool with the same key and keeps the key for 7 days', async () => {
    const idempotencyKey = randomUUID();
    const first = await callTool(agent, 'draft_campaign', { body: draft(), idempotencyKey });
    const again = await callTool(agent, 'draft_campaign', { body: draft(), idempotencyKey });
    expect(first.isError).toBeUndefined();
    expect(again.structuredContent.id).toBe(first.structuredContent.id);
    const row = await owner.withActor(CLI, (trx) =>
      trx
        .selectFrom('idempotency_keys')
        .select(['created_at', 'expires_at'])
        .where('key', '=', idempotencyKey)
        .executeTakeFirstOrThrow(),
    );
    const days = (row.expires_at.getTime() - row.created_at.getTime()) / 86_400_000;
    expect(Math.round(days)).toBe(7);
    const missing = await callTool(agent, 'draft_campaign', { body: draft() });
    expect(codeOf(missing)).toBe('idempotency_key_required');
  });

  it('refuses to schedule a post that is not approved', async () => {
    const drafted = await callTool(agent, 'draft_campaign', {
      body: draft(),
      idempotencyKey: randomUUID(),
    });
    const result = await callTool(agent, 'schedule_approved_post', {
      postId: drafted.structuredContent.id,
      body: {
        expectedVersion: drafted.structuredContent.version,
        mode: 'instant',
        scheduleLocal: inMinutes(120),
        scheduleTz: TZ,
      },
      idempotencyKey: randomUUID(),
    });
    expect(result.isError).toBe(true);
    expect(codeOf(result)).toBe('approval_required');
  });

  it('INJ-02: wraps third-party text as untrusted', async () => {
    const channels = await callTool(agent, 'list_channels', {});
    const [first] = channels.structuredContent.items as { displayName: unknown }[];
    expect(first?.displayName).toEqual({ untrusted: true, source: 'provider', text: 'Account A' });
    const post = await create(ownerAuth, draft());
    const preview = await callTool(agent, 'preview_post', { postId: post.id });
    const [destination] = preview.structuredContent.destinations as {
      items: { text: unknown }[];
    }[];
    expect(destination?.items[0]?.text).toEqual({ untrusted: true, source: 'post', text: 'Ahoj' });
    const status = await callTool(agent, 'validate_draft', { postId: post.id });
    expect(status.structuredContent.valid).toBe(true);
  });

  it('SEC-01: no credential or key reaches MCP output', async () => {
    const canary = `CANARY_${randomBytes(12).toString('hex')}`;
    await db.withTenant(workspaceId, { kind: 'user', id: ownerId }, (trx) =>
      saveCredential(trx, keyring, {
        workspaceId,
        socialAccountId: decodePublicId('socialAccount', accountA) ?? '',
        kind: 'oauth',
        value: { token: canary },
        grantedScopes: [],
      }),
    );
    const post = await create(ownerAuth, draft());
    const outputs: string[] = [JSON.stringify(await listTools(agent))];
    for (const [name, args] of [
      ['get_brand_context', {}],
      ['list_channels', {}],
      ['list_account_groups', {}],
      ['get_publish_status', { postId: post.id }],
      ['preview_post', { postId: post.id }],
      ['validate_draft', { postId: post.id }],
      ['get_post_metrics', { postId: post.id }],
      ['get_publish_status', { postId: 'post_missing' }],
    ] as const) {
      outputs.push(JSON.stringify(await callTool(agent, name, args)));
    }
    const secret = 'bearer' in agent ? agent.bearer : '';
    for (const output of outputs) {
      expect(output).not.toContain(canary);
      expect(output).not.toContain(secret);
    }
  });
});
