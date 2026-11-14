import {
  isProviderFailure,
  type MediaRef,
  ProviderFailure,
  type PublishContext,
  type PublishInput,
  type PublishItem,
  type PublishOutcome,
  type VerifyOutcome,
} from '@kronaut/core';
import * as z from 'zod';
import { permanent } from '../_kit/meta-graph.ts';
import { checkVideoFile, planOf } from '../_kit/meta-input.ts';
import { beginPublicSend } from '../_kit/public-send.ts';
import { type YoutubeSettings, youtubeManifest } from './manifest.ts';
import type { YoutubeCredentials } from './oauth.ts';
import {
  initiate,
  queryStatus,
  type Session,
  sendChunks,
  sessionTarget,
  type Upload,
  videoId,
} from './upload.ts';

type Input = PublishInput<YoutubeCredentials, YoutubeSettings>;

const WATCH_URL = 'https://www.youtube.com/watch?v=';

const youtubeState = z.object({
  sessionUri: z.string().optional(),
  sentAt: z.iso.datetime().optional(),
  videoId: videoId.optional(),
});
type State = z.infer<typeof youtubeState>;

interface Opened {
  readonly session: Session;
  readonly offset: number;
  readonly state: State;
}

interface Video {
  readonly item: PublishItem;
  readonly ref: MediaRef;
}

function stateOf(value: unknown): State {
  const { success, data } = youtubeState.safeParse(value);
  if (success) return data;
  throw permanent('state_invalid');
}

function videoOf(input: Input): Video {
  const { spec, item } = planOf(youtubeManifest, input);
  const [ref, ...rest] = item.media;
  if (ref === undefined || rest.length > 0 || spec.media.video === undefined)
    throw permanent('video_required');
  checkVideoFile(spec.media.video, ref);
  return { item, ref };
}

function metadataOf(settings: YoutubeSettings, { item, ref }: Video): unknown {
  const { title, privacy, madeForKids } = settings;
  if (title === undefined || title.trim() === '') throw permanent('title_missing');
  return {
    snippet: { title, description: item.text },
    status: {
      privacyStatus: privacy,
      containsSyntheticMedia: ref.aiGenerated,
      ...(madeForKids === undefined ? {} : { selfDeclaredMadeForKids: madeForKids }),
    },
  };
}

function watch(id: string): { readonly remoteId: string; readonly url: string } {
  return { remoteId: id, url: `${WATCH_URL}${id}` };
}

async function completed(ctx: PublishContext, state: State, id: string): Promise<PublishOutcome> {
  await ctx.checkpoint({
    ...(state.sentAt === undefined ? {} : { sentAt: state.sentAt }),
    videoId: id,
  });
  return { kind: 'published', ...watch(id) };
}

async function start(upload: Upload, state: State, metadata: unknown): Promise<Opened> {
  const uri = await initiate(upload, metadata);
  const opened = { ...state, sessionUri: uri.href };
  await upload.ctx.checkpoint(opened);
  return { session: { ...upload, uri }, offset: 0, state: opened };
}

async function open(upload: Upload, state: State, metadata: unknown): Promise<Opened | string> {
  if (state.sessionUri === undefined) return start(upload, state, metadata);
  const session = { ...upload, uri: sessionTarget(state.sessionUri) };
  const progress = await queryStatus(session, state.sentAt === undefined ? 'private' : 'public');
  if (progress.kind === 'done') return progress.videoId;
  if (progress.kind === 'incomplete') return { session, offset: progress.offset, state };
  if (state.sentAt !== undefined)
    throw new ProviderFailure({ kind: 'ambiguous', detail: 'upload_session_expired' });
  return start(upload, {}, metadata);
}

export async function publishVideo(ctx: PublishContext, input: Input): Promise<PublishOutcome> {
  const video = videoOf(input);
  const initial = stateOf(input.state);
  if (initial.videoId !== undefined) return { kind: 'published', ...watch(initial.videoId) };
  const metadata = metadataOf(input.settings, video);
  if (initial.sentAt !== undefined) await ctx.step('upload_video');
  const bytes = await ctx.media.read(video.ref.id);
  const upload: Upload = { ctx, token: input.credentials.accessToken, total: bytes.byteLength };
  const opened = await open(upload, initial, metadata);
  if (typeof opened === 'string') return completed(ctx, initial, opened);
  const state =
    opened.state.sentAt === undefined
      ? await beginPublicSend(ctx, 'upload_video', opened.state)
      : opened.state;
  return completed(ctx, state, await sendChunks(opened.session, bytes, opened.offset));
}

export async function verifyUpload(ctx: PublishContext, input: Input): Promise<VerifyOutcome> {
  const state = youtubeState.safeParse(input.state).data;
  if (state?.videoId !== undefined) return { kind: 'found', ...watch(state.videoId) };
  const ref = input.items[0]?.media[0];
  if (state?.sessionUri === undefined || ref === undefined) return { kind: 'inconclusive' };
  try {
    const uri = sessionTarget(state.sessionUri);
    const session = { ctx, token: input.credentials.accessToken, total: ref.bytes, uri };
    const progress = await queryStatus(session, 'none');
    if (progress.kind === 'done') return { kind: 'found', ...watch(progress.videoId) };
    return { kind: progress.kind === 'incomplete' ? 'absent' : 'inconclusive' };
  } catch (error) {
    if (isProviderFailure(error)) return { kind: 'inconclusive' };
    throw error;
  }
}
