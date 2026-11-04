import { encodePublicId, toDate } from '@kronaut/core';
import type { TenantDb } from '@kronaut/db';
import type { HttpClient } from '@kronaut/egress';
import { sql } from 'kysely';
import { HttpError } from '../../base/http/errors.ts';
import type { RequestContext } from '../../base/http/request.ts';
import type { ProviderRegistry } from '../../base/providers/providers.ts';
import { auditFeed, type FeedRef } from './audit.ts';
import { FeedFailed, fetchFeed } from './fetch.ts';
import { type FeedMode, feedChannels, feedName, feedTemplate, feedUrl } from './input.ts';
import type { FeedItem } from './parse.ts';
import { markSeen } from './seen.ts';
import { checkRoom, feedOwner, readFeed, replaceChannels, type StoredFeed } from './store.ts';
import { DEFAULT_TEMPLATE } from './template.ts';

export interface SaveDeps {
  readonly providers: ProviderRegistry;
  readonly http: HttpClient;
}

export interface FeedCreate {
  readonly url: string;
  readonly name: string;
  readonly channelIds: readonly string[];
  readonly mode: FeedMode;
  readonly template?: string | undefined;
}

export interface FeedChange {
  readonly url?: string | undefined;
  readonly name?: string | undefined;
  readonly channelIds?: readonly string[] | undefined;
  readonly mode?: FeedMode | undefined;
  readonly template?: string | undefined;
  readonly paused?: boolean | undefined;
}

interface FirstCheck {
  readonly items: readonly FeedItem[];
  readonly etag: string | null;
  readonly lastModified: string | null;
}

const NO_VALIDATORS = { etag: null, lastModified: null };

async function firstCheck(http: HttpClient, url: string): Promise<FirstCheck> {
  try {
    const fetched = await fetchFeed(http, url, NO_VALIDATORS);
    if (fetched.kind === 'fetched') return fetched;
  } catch (error) {
    if (!(error instanceof FeedFailed)) throw error;
    if (error.kind === 'feed_invalid' || error.kind === 'too_large') {
      throw new HttpError('unprocessable', 'The link is not an RSS or Atom feed.', {
        details: [{ path: 'body.url', code: 'feed_invalid' }],
      });
    }
  }
  throw new HttpError('unprocessable', 'The feed could not be fetched.', {
    details: [{ path: 'body.url', code: 'feed_unreachable' }],
  });
}

function checkedColumns(found: FirstCheck, at: Date) {
  return {
    etag: found.etag,
    last_modified: found.lastModified,
    last_checked_at: at,
    last_error: null,
    failing_since: null,
  };
}

export async function createFeed(
  ctx: RequestContext,
  deps: SaveDeps,
  workspaceId: string,
  body: FeedCreate,
): Promise<StoredFeed> {
  const fields = {
    url: feedUrl(body.url),
    name: feedName(body.name),
    mode: body.mode,
    template: feedTemplate(body.template ?? DEFAULT_TEMPLATE),
  };
  const check = { workspaceId, channelIds: body.channelIds, mode: body.mode };
  await ctx.tenant(async (trx) => {
    await feedChannels(trx, deps.providers, check);
    await checkRoom(trx, workspaceId);
  });
  const found = await firstCheck(deps.http, fields.url);
  return await ctx.tenant(async (trx) => {
    const channels = await feedChannels(trx, deps.providers, check);
    await checkRoom(trx, workspaceId);
    const at = toDate(ctx.now);
    const { id } = await trx
      .insertInto('rss_feeds')
      .values({
        workspace_id: workspaceId,
        ...fields,
        owner_user_id: feedOwner(ctx.principal),
        ...checkedColumns(found, at),
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    const ref = { workspaceId, feedId: id };
    await replaceChannels(trx, ref, channels);
    await markSeen(trx, { ...ref, at }, found.items);
    await auditFeed(trx, ctx, { ref, action: 'rss_feed.created', args: { mode: fields.mode } });
    return await readFeed(trx, ref);
  });
}

interface Next {
  readonly url: string;
  readonly name: string;
  readonly mode: FeedMode;
  readonly template: string;
}

type Fields = { readonly [K in keyof Next]?: Next[K] | undefined };

function validFields(body: FeedChange): Fields {
  return {
    url: body.url === undefined ? undefined : feedUrl(body.url),
    name: body.name === undefined ? undefined : feedName(body.name),
    mode: body.mode,
    template: body.template === undefined ? undefined : feedTemplate(body.template),
  };
}

function nextFields(current: StoredFeed, fields: Fields): Next {
  return {
    url: fields.url ?? current.url,
    name: fields.name ?? current.name,
    mode: fields.mode ?? (current.mode as FeedMode),
    template: fields.template ?? current.template,
  };
}

function channelCheck(ref: FeedRef, current: StoredFeed, body: FeedChange, mode: FeedMode) {
  const recheck = body.channelIds !== undefined || body.mode !== undefined || body.paused === false;
  if (!recheck) return null;
  const channelIds =
    body.channelIds ?? current.channels.map((id) => encodePublicId('socialAccount', id));
  return { workspaceId: ref.workspaceId, channelIds, mode };
}

function stateColumns(current: StoredFeed, paused: boolean | undefined) {
  if (paused === true && current.state === 'active') {
    return { action: 'rss_feed.paused', set: { state: 'paused', paused_reason: 'manual' } };
  }
  if (paused === false && current.state === 'paused') {
    const set = { state: 'active', paused_reason: null, last_error: null, failing_since: null };
    return { action: 'rss_feed.resumed', set };
  }
  return null;
}

function changedArgs(current: StoredFeed, next: Next, channels: readonly string[]) {
  return {
    urlChanged: next.url !== current.url,
    renamed: next.name !== current.name,
    modeChanged: next.mode !== current.mode,
    templateChanged: next.template !== current.template,
    channelsChanged: channels.join() !== current.channels.join(),
  };
}

interface Saving {
  readonly ref: FeedRef;
  readonly body: FeedChange;
  readonly fields: Fields;
  readonly found: FirstCheck | null;
}

async function writeChange(trx: TenantDb, ctx: RequestContext, deps: SaveDeps, saving: Saving) {
  const { ref, body, fields, found } = saving;
  const current = await readFeed(trx, ref, true);
  if (found === null && fields.url !== undefined && fields.url !== current.url) {
    throw new HttpError('conflict', 'The feed was changed meanwhile: try again.');
  }
  const next = nextFields(current, fields);
  const check = channelCheck(ref, current, body, next.mode);
  const channels =
    check === null ? current.channels : (await feedChannels(trx, deps.providers, check)).sort();
  const state = stateColumns(current, body.paused);
  const at = toDate(ctx.now);
  await trx
    .updateTable('rss_feeds')
    .set({
      ...next,
      owner_user_id: feedOwner(ctx.principal),
      ...state?.set,
      ...(found === null ? {} : checkedColumns(found, at)),
      updated_at: sql<Date>`now()`,
    })
    .where('workspace_id', '=', ref.workspaceId)
    .where('id', '=', ref.feedId)
    .execute();
  if (body.channelIds !== undefined) await replaceChannels(trx, ref, channels);
  if (found !== null) await markSeen(trx, { ...ref, at }, found.items);
  const args = changedArgs(current, next, channels);
  if (Object.values(args).some(Boolean)) {
    await auditFeed(trx, ctx, { ref, action: 'rss_feed.updated', args });
  }
  if (state !== null) await auditFeed(trx, ctx, { ref, action: state.action });
}

// Fields left out of the body take the locked row's value, so a concurrent edit isn't reverted.
export async function updateFeed(
  ctx: RequestContext,
  deps: SaveDeps,
  ref: FeedRef,
  body: FeedChange,
): Promise<StoredFeed> {
  const fields = validFields(body);
  const current = await ctx.tenant((trx) => readFeed(trx, ref));
  const check = channelCheck(ref, current, body, nextFields(current, fields).mode);
  if (check !== null) await ctx.tenant((trx) => feedChannels(trx, deps.providers, check));
  const moved = fields.url !== undefined && fields.url !== current.url;
  const found = moved ? await firstCheck(deps.http, fields.url) : null;
  return await ctx.tenant(async (trx) => {
    await writeChange(trx, ctx, deps, { ref, body, fields, found });
    return await readFeed(trx, ref);
  });
}
