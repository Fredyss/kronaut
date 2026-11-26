import { randomBytes } from 'node:crypto';
import { encodePublicId } from '@kronaut/core';
import { createKeyring, type Keyring } from '@kronaut/credentials';
import { type Actor, createDatabase, type Database } from '@kronaut/db';
import type { Hono } from 'hono';
import { sql } from 'kysely';
import { type Logger, pino } from 'pino';
import {
  BASE,
  createTestInstance,
  createTestUser,
  insertTestGrant,
  loginAs,
  randomGrantToken,
  requestAs,
  type TestRequest,
} from '../../base/http/testing.ts';

export const SYSTEM: Actor = { kind: 'system' };
const CLI: Actor = { kind: 'cli' };

export interface HookUrls {
  readonly appUrl: string;
  readonly ownerUrl: string;
}

export interface HookFixture {
  readonly db: Database;
  readonly root: Database;
  readonly keyring: Keyring;
  readonly app: Hono;
  readonly logger: Logger;
  readonly lines: string[];
  readonly workspaceId: string;
  readonly otherWorkspaceId: string;
  readonly cookies: Readonly<Record<'owner' | 'admin' | 'editor' | 'viewer' | 'outsider', string>>;
  readonly grantToken: string;
}

async function provision(db: Database, userId: string, slug: string): Promise<string> {
  return await db.withActor({ kind: 'user', id: userId }, async (trx) => {
    const result = await sql<{ workspace_id: string }>`
      select workspace_id from provision_organization('Org', ${slug}, ${slug}, 'Europe/Bratislava')
    `.execute(trx);
    return result.rows[0]?.workspace_id ?? '';
  });
}

async function addMembers(root: Database, workspaceId: string, ids: Record<string, string>) {
  await root.withActor(CLI, (trx) =>
    trx
      .insertInto('memberships')
      .values(
        (['admin', 'editor', 'viewer'] as const).map((role) => ({
          workspace_id: workspaceId,
          user_id: ids[role] ?? '',
          role,
        })),
      )
      .execute(),
  );
}

export async function startHooks(test: HookUrls): Promise<HookFixture> {
  const db = createDatabase({ connectionString: test.appUrl });
  const root = createDatabase({ connectionString: test.ownerUrl });
  const keyring = createKeyring(new Map([[1, randomBytes(32)]]));
  const lines: string[] = [];
  const logger = pino({ level: 'debug' }, { write: (line: string) => lines.push(line) });
  const instance = createTestInstance({ db, keyring, logger });
  const ids: Record<string, string> = {};
  for (const label of ['owner', 'admin', 'editor', 'viewer', 'outsider']) {
    ids[label] = await createTestUser(db, label);
  }
  const workspaceId = await provision(db, ids.owner ?? '', 'ws-hooks');
  const otherWorkspaceId = await provision(db, ids.outsider ?? '', 'ws-other');
  await addMembers(root, workspaceId, ids);
  const grantToken = randomGrantToken();
  await root.withTenant(workspaceId, CLI, (trx) =>
    insertTestGrant(trx, instance.deps.keys.grant, grantToken, {
      workspaceId,
      sponsorUserId: ids.owner ?? '',
      scopes: ['posts:read'],
    }),
  );
  const cookies = {
    owner: (await loginAs(instance.app, 'owner')).cookie,
    admin: (await loginAs(instance.app, 'admin')).cookie,
    editor: (await loginAs(instance.app, 'editor')).cookie,
    viewer: (await loginAs(instance.app, 'viewer')).cookie,
    outsider: (await loginAs(instance.app, 'outsider')).cookie,
  };
  const app = instance.app;
  return {
    db,
    root,
    keyring,
    app,
    logger,
    lines,
    workspaceId,
    otherWorkspaceId,
    cookies,
    grantToken,
  };
}

export async function stopHooks(fixture: HookFixture | undefined): Promise<void> {
  await fixture?.db.destroy();
  await fixture?.root.destroy();
}

function hooksUrl(workspaceId: string, path = ''): string {
  return `${BASE}/v1/workspaces/${encodePublicId('workspace', workspaceId)}/webhooks${path}`;
}

export interface HookCall extends Omit<TestRequest, 'url'> {
  readonly path?: string;
  readonly workspaceId?: string;
}

export async function callHooks(
  fixture: HookFixture,
  auth: { readonly cookie: string } | { readonly bearer: string },
  request: HookCall,
): Promise<{ status: number; json: Record<string, unknown> | null; text: string }> {
  const url = hooksUrl(request.workspaceId ?? fixture.workspaceId, request.path);
  const response = await requestAs(fixture.app, auth, { ...request, url });
  const text = await response.text();
  return { status: response.status, json: text === '' ? null : JSON.parse(text), text };
}
