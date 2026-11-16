import {
  ProviderFailure,
  type ProviderHttpResponse,
  type PublishContext,
  type StepEffect,
} from '@kronaut/core';
import * as z from 'zod';
import { unexpectedResponse } from '../_kit/failure.ts';
import { readJson, send } from '../_kit/http.ts';
import { permanent } from '../_kit/meta-graph.ts';
import { isSuccess, youtubeFailure } from './errors.ts';

const INITIATE_URL =
  'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status';
const UPLOAD_ORIGIN = 'https://www.googleapis.com';
const MIME = 'video/mp4';
export const CHUNK_BYTES = 4 * 1024 * 1024;
const RANGE = /^bytes=0-(\d{1,15})$/;

export const videoId = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/);
const videoResource = z.looseObject({ id: videoId });

export interface Upload {
  readonly ctx: PublishContext;
  readonly token: string;
  readonly total: number;
}

export interface Session extends Upload {
  readonly uri: URL;
}

type Sent = { readonly kind: 'done'; readonly videoId: string } | Incomplete;
type Incomplete = { readonly kind: 'incomplete'; readonly offset: number };
export type Progress = Sent | { readonly kind: 'expired' };

export function sessionTarget(raw: string | null): URL {
  const url = raw !== null && URL.canParse(raw) ? new URL(raw) : undefined;
  if (url?.origin !== UPLOAD_ORIGIN || url.username !== '' || url.password !== '')
    throw permanent('upload_url_invalid');
  return url;
}

export async function initiate(upload: Upload, metadata: unknown): Promise<URL> {
  const { ctx, token, total } = upload;
  const response = await send(ctx, 'private', INITIATE_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Length': String(total),
      'X-Upload-Content-Type': MIME,
    },
    body: JSON.stringify(metadata),
  });
  if (!isSuccess(response.status)) throw await youtubeFailure(response, 'private', ctx.now());
  return sessionTarget(response.headers.get('location'));
}

function nextOffset(range: string | null, total: number, effect: StepEffect): number {
  if (range === null) return 0;
  const last = Number(RANGE.exec(range)?.[1]);
  if (!Number.isSafeInteger(last) || last + 1 >= total) throw unexpectedResponse(effect);
  return last + 1;
}

async function progressOf(
  session: Session,
  response: ProviderHttpResponse,
  effect: StepEffect,
): Promise<Sent> {
  const { status } = response;
  if (status === 200 || status === 201) {
    const { id } = await readJson(response, videoResource, effect);
    return { kind: 'done', videoId: id };
  }
  if (status === 308)
    return {
      kind: 'incomplete',
      offset: nextOffset(response.headers.get('range'), session.total, effect),
    };
  throw await youtubeFailure(response, effect, session.ctx.now());
}

export async function queryStatus(session: Session, effect: StepEffect): Promise<Progress> {
  const response = await send(session.ctx, effect, session.uri, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${session.token}`,
      'Content-Length': '0',
      'Content-Range': `bytes */${session.total}`,
    },
  });
  if (response.status === 404) return { kind: 'expired' };
  return progressOf(session, response, effect);
}

export async function sendChunks(
  session: Session,
  bytes: Uint8Array,
  start: number,
): Promise<string> {
  const { ctx, token, total, uri } = session;
  let offset = start;
  for (;;) {
    const end = Math.min(offset + CHUNK_BYTES, total);
    const response = await send(ctx, 'public', uri, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': MIME,
        'Content-Range': `bytes ${offset}-${end - 1}/${total}`,
      },
      body: bytes.subarray(offset, end),
    });
    const progress = await progressOf(session, response, 'public');
    if (progress.kind === 'done') return progress.videoId;
    if (progress.offset <= offset)
      throw new ProviderFailure({ kind: 'ambiguous', detail: 'upload_stalled' });
    offset = progress.offset;
  }
}
