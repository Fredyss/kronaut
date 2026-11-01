import { decodePublicId } from '@kronaut/core';
import type { Actor, Database } from '@kronaut/db';
import type { EgressResponse, HttpClient } from '@kronaut/egress';
import pino, { type Logger } from 'pino';
import { expect } from 'vitest';
import type { Auth } from '../../http/testing.ts';
import type { MediaImportDeps } from '../import.ts';
import { mediaImportCreateRoute } from '../import-routes.ts';
import type { MediaDb, Tenant } from './db.ts';

export const SYSTEM: Actor = { kind: 'system' };
export const LINK = 'https://cdn.example.test/files/photo.jpg';

export interface Reply {
  readonly status?: number;
  readonly chunks?: readonly Uint8Array[];
  readonly tail?: Error;
  readonly error?: Error;
}

export interface ScriptedHttp extends HttpClient {
  readonly urls: string[];
  readonly signals: (AbortSignal | undefined)[];
  discarded: number;
}

function respond(url: string, reply: Reply, http: ScriptedHttp): EgressResponse {
  const unused = () => Promise.reject(new Error('the import must stream the body'));
  return {
    status: reply.status ?? 200,
    headers: new Headers(),
    url,
    redirected: false,
    bytes: unused,
    text: unused,
    json: unused,
    async *chunks() {
      yield* reply.chunks ?? [];
      if (reply.tail !== undefined) throw reply.tail;
    },
    discard() {
      http.discarded++;
    },
  };
}

export function scriptedHttp(...replies: readonly Reply[]): ScriptedHttp {
  const pending = [...replies];
  const http: ScriptedHttp = {
    urls: [],
    signals: [],
    discarded: 0,
    async request(url, init) {
      http.urls.push(String(url));
      http.signals.push(init?.signal);
      const reply = pending.shift();
      if (reply === undefined) throw new Error('no reply is scripted');
      if (reply.error !== undefined) throw reply.error;
      return respond(String(url), reply, http);
    },
    fetch: () => Promise.reject(new Error('the import must use request')),
  };
  return http;
}

export function capturedLogger(): { logger: Logger; lines: string[] } {
  const lines: string[] = [];
  const logger = pino({ level: 'debug' }, { write: (line: string) => lines.push(line) });
  return { logger, lines };
}

export function importDeps(fx: MediaDb, http: HttpClient, logger: Logger): MediaImportDeps {
  return { db: fx.db, store: fx.store, staging: fx.staging, http, logger };
}

export interface Started {
  readonly job: { readonly workspaceId: string; readonly id: string };
  readonly publicId: string;
}

export interface StartOptions {
  readonly url?: string;
  readonly aiGenerated?: boolean;
  readonly auth?: Auth;
}

let keys = 0;

export async function startImport(
  fx: MediaDb,
  tenant: Tenant,
  { url = LINK, aiGenerated, auth }: StartOptions = {},
): Promise<Started> {
  keys++;
  const response = await fx.call(tenant, 'POST', 'media/imports', {
    body: { url, ...(aiGenerated === undefined ? {} : { aiGenerated }) },
    key: `import-key-${keys}`,
    ...(auth === undefined ? {} : { auth }),
  });
  expect(response.status).toBe(202);
  const { id: publicId } = mediaImportCreateRoute.response.parse(await response.json());
  const id = decodePublicId('mediaImport', publicId);
  if (id === null) throw new Error(`not an import id: ${publicId}`);
  return { job: { workspaceId: tenant.workspaceId, id }, publicId };
}

export function importRow(db: Database, { workspaceId, id }: Started['job']) {
  return db.withTenant(workspaceId, SYSTEM, (trx) =>
    trx
      .selectFrom('media_imports')
      .select([
        'state',
        'url',
        'error',
        'media_id',
        'ai_generated',
        'requested_by_user_id',
        'requested_by_grant_id',
        'finished_at',
      ])
      .where('workspace_id', '=', workspaceId)
      .where('id', '=', id)
      .executeTakeFirst(),
  );
}
