import { type MediaRef, ProviderFailure, type PublishContext } from '@kronaut/core';
import * as z from 'zod';
import { readJson, send } from '../_kit/http.ts';
import { permanent } from '../_kit/meta-graph.ts';
import { isSuccess, linkedinFailure } from './errors.ts';
import { type State, videoUrn } from './publish-input.ts';
import { type Member, restGet, restPost, uploadTarget } from './rest.ts';

const INIT_PATH = '/rest/videos?action=initializeUpload';
const FINALIZE_PATH = '/rest/videos?action=finalizeUpload';

const initialized = z.looseObject({
  value: z.looseObject({
    video: videoUrn,
    uploadToken: z.string(),
    uploadInstructions: z
      .array(
        z.looseObject({
          firstByte: z.number().int().min(0),
          lastByte: z.number().int(),
          uploadUrl: z.string(),
        }),
      )
      .nonempty(),
  }),
});
type Instruction = z.infer<typeof initialized>['value']['uploadInstructions'][number];

const statusBody = z.looseObject({ status: z.string() });

function checkInstructions(instructions: readonly Instruction[], size: number): void {
  let next = 0;
  for (const { firstByte, lastByte } of instructions) {
    if (firstByte !== next || lastByte < firstByte) throw permanent('upload_instructions_invalid');
    next = lastByte + 1;
  }
  if (next !== size) throw permanent('upload_instructions_invalid');
}

async function uploadPart(
  ctx: PublishContext,
  member: Member,
  part: { readonly instruction: Instruction; readonly bytes: Uint8Array },
): Promise<string> {
  const { instruction, bytes } = part;
  const response = await send(ctx, 'private', uploadTarget(instruction.uploadUrl), {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${member.token}`,
      'Content-Type': 'application/octet-stream',
    },
    body: bytes.subarray(instruction.firstByte, instruction.lastByte + 1),
  });
  if (!isSuccess(response.status)) throw await linkedinFailure(response, 'private', ctx.now());
  const etag = response.headers.get('etag');
  if (etag === null || etag === '')
    throw new ProviderFailure({ kind: 'transient', detail: 'etag_missing' });
  return etag;
}

export async function uploadVideo(
  ctx: PublishContext,
  member: Member,
  ref: MediaRef,
  state: State,
): Promise<State> {
  const bytes = await ctx.media.read(ref.id);
  const json = {
    initializeUploadRequest: {
      owner: member.author,
      fileSizeBytes: bytes.byteLength,
      uploadCaptions: false,
      uploadThumbnail: false,
    },
  };
  const init = await restPost(ctx, 'private', member, { path: INIT_PATH, json });
  if (!isSuccess(init.status)) throw await linkedinFailure(init, 'private', ctx.now());
  const { value } = await readJson(init, initialized, 'private');
  checkInstructions(value.uploadInstructions, bytes.byteLength);
  const etags: string[] = [];
  for (const instruction of value.uploadInstructions)
    etags.push(await uploadPart(ctx, member, { instruction, bytes }));
  const finalize = await restPost(ctx, 'private', member, {
    path: FINALIZE_PATH,
    json: {
      finalizeUploadRequest: {
        video: value.video,
        uploadToken: value.uploadToken,
        uploadedPartIds: etags,
      },
    },
  });
  if (!isSuccess(finalize.status)) throw await linkedinFailure(finalize, 'private', ctx.now());
  return { ...state, video: value.video };
}

export async function videoReady(
  ctx: PublishContext,
  member: Member,
  urn: string,
): Promise<'ready' | 'processing'> {
  const response = await restGet(ctx, 'private', member, `/rest/videos/${encodeURIComponent(urn)}`);
  if (response.status === 401 || response.status === 403) return 'ready';
  if (!isSuccess(response.status)) throw await linkedinFailure(response, 'private', ctx.now());
  const { status } = await readJson(response, statusBody, 'private');
  if (status === 'AVAILABLE') return 'ready';
  if (status === 'PROCESSING_FAILED') throw permanent('video_processing_failed');
  return 'processing';
}
