import { randomUUID } from 'node:crypto';
import type { Keyring } from '@kronaut/credentials';
import type { TenantDb } from '@kronaut/db';
import type { HttpClient } from '@kronaut/egress';
import { auditActor } from '../../access/audit/write.ts';
import { HttpError } from '../../base/http/errors.ts';
import type { RequestContext } from '../../base/http/request.ts';
import {
  openShortenerKey,
  sealShortenerKey,
} from '../../infrastructure/credentials/shortener-key.ts';
import { ShortenerFailed } from './failure.ts';
import { shortenerBaseUrl, shortenerDomain, shortenerKey } from './input.ts';
import { createShortener, type ShortenerConfig, type ShortenerProvider } from './shortener.ts';
import { loadShortener, type StoredShortener } from './store.ts';

export interface SaveDeps {
  readonly keyring: Keyring;
  readonly http: HttpClient;
}

export interface ShortenerConnect {
  readonly provider: ShortenerProvider;
  readonly baseUrl?: string | undefined;
  readonly domain?: string | null | undefined;
  readonly apiKey: string;
}

export interface ShortenerChange {
  readonly baseUrl?: string | undefined;
  readonly domain?: string | null | undefined;
  readonly apiKey?: string | undefined;
}

type Ctx = Pick<RequestContext, 'tenant' | 'principal' | 'requestId'>;

const NONE = () => new HttpError('not_found', 'The workspace has no link shortener.');

async function checkKey(http: HttpClient, config: ShortenerConfig): Promise<void> {
  try {
    await createShortener({ http, config }).checkKey();
  } catch (error) {
    if (error instanceof ShortenerFailed && error.kind === 'unauthorized') {
      throw new HttpError('unprocessable', 'The shortener refused the API key.', {
        details: [{ path: 'body.apiKey', code: 'shortener_unauthorized' }],
      });
    }
    throw new HttpError('unprocessable', 'The shortener could not be reached.', {
      details: [{ path: 'body.baseUrl', code: 'shortener_unreachable' }],
    });
  }
}

// The key is sealed and never part of an event, so only which fields changed is recorded.
async function audit(
  trx: TenantDb,
  ctx: Ctx,
  row: { workspaceId: string; id: string },
  change: {
    readonly action: string;
    readonly args: Readonly<Record<string, string | boolean>>;
  },
) {
  const actor = await auditActor(trx, row.workspaceId, ctx.principal);
  await trx
    .insertInto('audit_events')
    .values({
      workspace_id: row.workspaceId,
      ...actor,
      action: change.action,
      resource_kind: 'link_shortener',
      resource_id: row.id,
      outcome: 'ok',
      args_summary: JSON.stringify(change.args),
      correlation_id: randomUUID(),
      request_id: ctx.requestId,
    })
    .execute();
}

function sealed(
  deps: SaveDeps,
  workspaceId: string,
  row: { id: string; provider: string },
  key: string,
) {
  return sealShortenerKey(
    deps.keyring,
    { shortenerId: row.id, workspaceId, provider: row.provider },
    key,
  );
}

export async function connectShortener(
  ctx: Ctx,
  deps: SaveDeps,
  workspaceId: string,
  body: ShortenerConnect,
): Promise<StoredShortener> {
  const config: ShortenerConfig = {
    provider: body.provider,
    baseUrl: shortenerBaseUrl(body.provider, body.baseUrl),
    domain: shortenerDomain(body.domain ?? null),
    key: shortenerKey(body.apiKey),
  };
  await checkKey(deps.http, config);
  return await ctx.tenant(async (trx) => {
    if ((await loadShortener(trx, workspaceId, true)) !== null) {
      throw new HttpError('conflict', 'The workspace already has a link shortener.');
    }
    const id = randomUUID();
    await trx
      .insertInto('link_shorteners')
      .values({
        workspace_id: workspaceId,
        id,
        provider: config.provider,
        base_url: config.baseUrl,
        domain: config.domain,
        ...sealed(deps, workspaceId, { id, provider: config.provider }, config.key),
      })
      .execute();
    await audit(
      trx,
      ctx,
      { workspaceId, id },
      {
        action: 'link_shortener.connected',
        args: { provider: config.provider },
      },
    );
    const stored = await loadShortener(trx, workspaceId);
    if (stored === null) throw new Error('link shortener missing after insert');
    return stored;
  });
}

function nextConfig(
  deps: SaveDeps,
  workspaceId: string,
  stored: StoredShortener,
  body: ShortenerChange,
) {
  const { provider } = stored;
  return {
    provider,
    baseUrl:
      body.baseUrl === undefined ? stored.base_url : shortenerBaseUrl(provider, body.baseUrl),
    domain: body.domain === undefined ? stored.domain : shortenerDomain(body.domain),
    key:
      body.apiKey === undefined
        ? openShortenerKey(deps.keyring, { shortenerId: stored.id, workspaceId, provider }, stored)
        : shortenerKey(body.apiKey),
  } satisfies ShortenerConfig;
}

export async function updateShortener(
  ctx: Ctx,
  deps: SaveDeps,
  workspaceId: string,
  body: ShortenerChange,
): Promise<StoredShortener> {
  const before = await ctx.tenant((trx) => loadShortener(trx, workspaceId));
  if (before === null) throw NONE();
  const config = nextConfig(deps, workspaceId, before, body);
  await checkKey(deps.http, config);
  return await ctx.tenant(async (trx) => {
    const current = await loadShortener(trx, workspaceId, true);
    if (current === null) throw NONE();
    if (current.id !== before.id) throw new HttpError('conflict', 'The link shortener changed.');
    await trx
      .updateTable('link_shorteners')
      .set({
        base_url: config.baseUrl,
        domain: config.domain,
        ...(body.apiKey === undefined ? {} : sealed(deps, workspaceId, current, config.key)),
      })
      .where('workspace_id', '=', workspaceId)
      .where('id', '=', current.id)
      .execute();
    await audit(
      trx,
      ctx,
      { workspaceId, id: current.id },
      {
        action: 'link_shortener.updated',
        args: {
          base_url: config.baseUrl !== current.base_url,
          domain: config.domain !== current.domain,
          api_key: body.apiKey !== undefined,
        },
      },
    );
    return (await loadShortener(trx, workspaceId)) ?? current;
  });
}

export async function removeShortener(ctx: Ctx, workspaceId: string): Promise<void> {
  await ctx.tenant(async (trx) => {
    const row = await trx
      .deleteFrom('link_shorteners')
      .where('workspace_id', '=', workspaceId)
      .returning(['id', 'provider'])
      .executeTakeFirst();
    if (row === undefined) throw NONE();
    await audit(
      trx,
      ctx,
      { workspaceId, id: row.id },
      {
        action: 'link_shortener.removed',
        args: { provider: row.provider },
      },
    );
  });
}
