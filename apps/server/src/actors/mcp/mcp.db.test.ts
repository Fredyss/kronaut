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
  internal,
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
import { addMember, decided, openRequestOf, setPolicy } from '../../steps/approvals/testing.ts';

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

interface ToolError {
  readonly code?: string;
  readonly details?: unknown;
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
  expect(result.isError).toBe(true);
  const body = JSON.parse(result.content[0]?.text ?? '{}') as { error?: ToolError };
  return body.error?.code;
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
    const cookie = await rpc(ownerAuth, 'initialize', init);
    expect(cookie.status).toBe(401);
    expect(cookie.headers.get('www-authenticate')).toBe('Bearer realm="kronaut"');
    const get = await app.request(mcpUrl(), { method: 'GET', headers: headersFor(agent) });
    expect(get.status).toBe(405);
  });

  it('takes one message per request and has no OAuth metadata', async () => {
    const message = { jsonrpc: '2.0', id: 1, method: 'tools/list' };
    const batch = await app.request(mcpUrl(), {
      method: 'POST',
      headers: headersFor(agent),
      body: JSON.stringify([message, { ...message, id: 2 }]),
    });
    expect(batch.status).toBe(400);
    const path = new URL(mcpUrl()).pathname;
    for (const metadata of ['', path]) {
      const url = `${BASE}/.well-known/oauth-protected-resource${metadata}`;
      expect((await app.request(url)).status).toBe(404);
    }
  });

  it('refuses a foreign Host or Origin and another workspace in the path', async () => {
    const foreign = await rpc(agent, 'tools/list', {}, { origin: 'https://evil.example.test' });
    expect(foreign.status).toBe(403);
    const rebound = await rpc(agent, 'tools/list', {}, { host: 'evil.example.test' });
    expect(rebound.status).toBe(403);
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

  it("lists only what the sponsor's current role allows", async () => {
    const sponsor = await addMember('mcp-sponsor', false);
    const sponsored = await insertGrant({ scopes: ALL_SCOPES, sponsorUserId: sponsor.id });
    expect(await listTools(sponsored)).toHaveLength(13);
    await owner.withActor(CLI, (trx) =>
      trx
        .updateTable('memberships')
        .set({ role: 'contributor' })
        .where('workspace_id', '=', workspaceId)
        .where('user_id', '=', sponsor.id)
        .execute(),
    );
    const listed = await listTools(sponsored);
    expect(listed).toHaveLength(11);
    expect(listed).not.toContain('schedule_approved_post');
    expect(listed).not.toContain('cancel_scheduled_post');
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

  it('schedules an approved post, and audits a cancel with the tool name', async () => {
    await setPolicy({ mode: 'required', allow_self_approval: false });
    const approver = await addMember('mcp-approver', true);
    const drafted = await callTool(agent, 'draft_campaign', {
      body: draft(),
      idempotencyKey: randomUUID(),
    });
    const postId = drafted.structuredContent.id as string;
    const requested = await callTool(agent, 'request_approval', {
      postId,
      body: { expectedVersion: drafted.structuredContent.version },
      idempotencyKey: randomUUID(),
    });
    expect(requested.isError).toBeUndefined();
    await decided(await openRequestOf({ id: postId } as PostDto), 'approve', approver.auth);
    const status = await callTool(agent, 'get_publish_status', { postId });
    const scheduled = await callTool(agent, 'schedule_approved_post', {
      postId,
      body: { expectedVersion: status.structuredContent.version, mode: 'asap' },
      idempotencyKey: randomUUID(),
    });
    expect(scheduled.isError).toBeUndefined();
    const [destination] = scheduled.structuredContent.destinations as { state: string }[];
    expect(destination?.state).toBe('scheduled');

    const canceled = await callTool(agent, 'cancel_scheduled_post', {
      postId,
      body: { expectedVersion: scheduled.structuredContent.version },
    });
    expect(canceled.isError).toBeUndefined();
    const audit = await owner.withActor(CLI, (trx) =>
      trx
        .selectFrom('audit_events')
        .select(['actor_kind', 'surface', 'tool'])
        .where('post_id', '=', internal(postId))
        .where('action', '=', 'destination.canceled')
        .execute(),
    );
    expect(audit).toEqual([{ actor_kind: 'grant', surface: 'mcp', tool: 'cancel_scheduled_post' }]);
  });

  it('builds the brand context from the parts the key may read', async () => {
    const full = await callTool(agent, 'get_brand_context', {});
    expect(full.isError).toBeUndefined();
    expect(full.structuredContent.omitted).toEqual([]);
    const fullBrands = full.structuredContent.brands as { archived: unknown }[];
    expect(fullBrands.every((brand) => typeof brand.archived === 'boolean')).toBe(true);
    const unbranded = full.structuredContent.unbranded as { channels: { id: string }[] };
    expect(unbranded.channels.length).toBeGreaterThan(0);
    const brandsOnly = await insertGrant({ scopes: ['posts:read', 'brands:read'] });
    const partial = await callTool(brandsOnly, 'get_brand_context', {});
    expect(partial.isError).toBeUndefined();
    expect(partial.structuredContent.omitted).toEqual(['channels']);
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
