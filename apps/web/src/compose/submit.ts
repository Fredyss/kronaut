import {
  type Client,
  mediaUpload,
  type PostsCreateData,
  postsCreate,
  postsGet,
  postsRequestApproval,
  postsSchedule,
  postsUpdate,
} from '@kronaut/sdk';
import { errorStatus, type Post } from '../api.ts';
import { approvalBody } from '../approvals/queries.ts';
import { idempotency, type Keyed, keyFor } from '../idempotency.ts';
import { distinctImages } from './contents.ts';
import type { Doc } from './doc.ts';
import { toBase64 } from './media.ts';

export interface ComposeImage {
  readonly id: string;
  readonly file: File;
  readonly altText: string;
}

export interface ComposeContent {
  readonly doc: Doc;
  readonly images: readonly ComposeImage[];
}

export interface ComposeDestination {
  readonly accountId: string;
  readonly publishType: string;
  readonly variant: number | null;
}

export type ComposeWhen =
  | { readonly mode: 'asap' }
  | { readonly mode: 'instant'; readonly scheduleLocal: string; readonly scheduleTz: string };

export interface ComposeInput {
  readonly content: ComposeContent;
  readonly variants: readonly ComposeContent[];
  readonly destinations: readonly ComposeDestination[];
  readonly when: ComposeWhen;
  readonly request: { readonly note: string } | null;
}

export interface SubmitTarget {
  readonly accountId: string;
  readonly variant: number | null;
}

export interface FailedImage {
  readonly index: number;
  readonly variant: number | null;
}

export type SubmitStep = 'upload' | 'create' | 'update' | 'schedule' | 'request';

export class SubmitError extends Error {
  readonly step: SubmitStep;
  readonly destinations: readonly SubmitTarget[];
  readonly image: FailedImage | null;

  constructor(
    step: SubmitStep,
    cause: unknown,
    destinations: readonly SubmitTarget[],
    image: FailedImage | null = null,
  ) {
    super(`compose ${step} failed`, { cause });
    this.name = 'SubmitError';
    this.step = step;
    this.destinations = destinations;
    this.image = image;
  }
}

interface PendingCreate extends Keyed {
  readonly body: PostsCreateData['body'];
  ambiguous: boolean;
}

function isAmbiguous(error: unknown): boolean {
  const status = errorStatus(error);
  return status === null || status === 0 || status >= 500;
}

export type Submit = (input: ComposeInput) => Promise<Post>;

type DraftBody = PostsCreateData['body'];

interface NextDraft {
  readonly body: DraftBody;
  readonly fingerprint: string;
}

interface Submitter {
  readonly client: Client;
  readonly workspaceId: string;
  readonly uploads: Map<string, { readonly key: string; mediaId: string | null }>;
  create: PendingCreate | null;
  update: Keyed | null;
  draft: { readonly fingerprint: string; post: Post } | null;
  schedule: Keyed | null;
  stale: boolean;
}

async function upload(
  s: Submitter,
  image: ComposeImage,
  failed: FailedImage,
  targets: readonly SubmitTarget[],
) {
  const entry = s.uploads.get(image.id) ?? { key: crypto.randomUUID(), mediaId: null };
  s.uploads.set(image.id, entry);
  if (entry.mediaId !== null) return entry.mediaId;
  try {
    const filename = image.file.name === '' ? {} : { filename: image.file.name.slice(0, 255) };
    const { data } = await mediaUpload({
      client: s.client,
      path: { workspaceId: s.workspaceId },
      body: { ...filename, dataBase64: await toBase64(image.file) },
      headers: { 'Idempotency-Key': entry.key },
    });
    entry.mediaId = data.id;
    return data.id;
  } catch (error) {
    throw new SubmitError('upload', error, targets, failed);
  }
}

async function uploadMedia(s: Submitter, input: ComposeInput, targets: readonly SubmitTarget[]) {
  const ids = new Map<string, string>();
  const lists = [input.content, ...input.variants].map((content) => content.images);
  for (const { image, content, index } of distinctImages(lists)) {
    const variant = content === 0 ? null : content - 1;
    ids.set(image.id, await upload(s, image, { index, variant }, targets));
  }
  return ids;
}

type DraftItem = DraftBody['items'][0];

function toItem(content: ComposeContent, ids: ReadonlyMap<string, string>): DraftItem {
  const media = content.images.map((image) => {
    const mediaId = ids.get(image.id);
    if (mediaId === undefined) throw new Error(`image ${image.id} was not uploaded`);
    const altText = image.altText.trim().normalize('NFC');
    return altText === '' ? { mediaId } : { mediaId, altText };
  });
  return { doc: { ...content.doc }, media };
}

function draftBody(input: ComposeInput, ids: ReadonlyMap<string, string>): DraftBody {
  const variants = input.variants.map((v) => ({ items: [toItem(v, ids)] satisfies [DraftItem] }));
  return {
    items: [toItem(input.content, ids)],
    ...(variants.length === 0 ? {} : { variants }),
    destinations: input.destinations.map(({ accountId, publishType, variant }) =>
      variant === null ? { accountId, publishType } : { accountId, publishType, variant },
    ),
  };
}

async function ensureDraft(
  s: Submitter,
  input: ComposeInput,
  accounts: readonly SubmitTarget[],
): Promise<Post> {
  const body = draftBody(input, await uploadMedia(s, input, accounts));
  const fingerprint = JSON.stringify(body);
  const next = { body, fingerprint };
  if (s.draft?.fingerprint === fingerprint) return s.draft.post;
  if (s.draft !== null) return await updateDraft(s, s.draft.post, next, accounts);
  if (s.create !== null && s.create.fingerprint !== fingerprint && s.create.ambiguous) {
    const earlier = await createDraft(s, s.create, accounts, true);
    if (earlier !== null) return await updateDraft(s, earlier, next, accounts);
  }
  if (s.create?.fingerprint !== fingerprint) {
    s.create = { fingerprint, key: crypto.randomUUID(), body, ambiguous: false };
  }
  return (await createDraft(s, s.create, accounts, false)) as Post;
}

async function createDraft(
  s: Submitter,
  entry: PendingCreate,
  accounts: readonly SubmitTarget[],
  replay: boolean,
): Promise<Post | null> {
  try {
    const { data } = await postsCreate({
      client: s.client,
      path: { workspaceId: s.workspaceId },
      body: entry.body,
      headers: idempotency(entry),
    });
    s.draft = { fingerprint: entry.fingerprint, post: data };
    s.create = null;
    return data;
  } catch (error) {
    entry.ambiguous = isAmbiguous(error);
    if (replay && !entry.ambiguous) {
      s.create = null;
      return null;
    }
    throw new SubmitError('create', error, accounts);
  }
}

async function patchDraft(s: Submitter, current: Post, next: NextDraft): Promise<Post> {
  let post = current;
  for (let attempt = 0; ; attempt++) {
    const patch = { expectedVersion: post.version, ...next.body };
    s.update = keyFor(s.update, JSON.stringify({ postId: post.id, patch }));
    try {
      const { data } = await postsUpdate({
        client: s.client,
        path: { workspaceId: s.workspaceId, postId: post.id },
        body: patch,
        headers: idempotency(s.update),
      });
      s.draft = { fingerprint: next.fingerprint, post: data };
      s.update = null;
      return data;
    } catch (error) {
      if (errorStatus(error) !== 409 || attempt > 0) throw error;
      post = await refresh(s, post);
    }
  }
}

async function updateDraft(
  s: Submitter,
  current: Post,
  next: NextDraft,
  accounts: readonly SubmitTarget[],
): Promise<Post> {
  try {
    return await patchDraft(s, s.stale ? await refresh(s, current) : current, next);
  } catch (error) {
    if (errorStatus(error) === 409) s.stale = true;
    throw new SubmitError('update', error, accounts);
  }
}

async function refresh(s: Submitter, post: Post): Promise<Post> {
  const { data } = await postsGet({
    client: s.client,
    path: { workspaceId: s.workspaceId, postId: post.id },
  });
  s.stale = false;
  return data;
}

async function finish(s: Submitter, post: Post, input: ComposeInput): Promise<Post> {
  const path = { workspaceId: s.workspaceId, postId: post.id };
  if (input.request !== null) {
    const body = approvalBody(post.version, input.when, input.request.note);
    s.schedule = keyFor(s.schedule, JSON.stringify({ postId: post.id, request: body }));
    const headers = idempotency(s.schedule);
    return (await postsRequestApproval({ client: s.client, path, body, headers })).data;
  }
  const body = { expectedVersion: post.version, ...input.when };
  s.schedule = keyFor(s.schedule, JSON.stringify({ postId: post.id, body }));
  const headers = idempotency(s.schedule);
  return (await postsSchedule({ client: s.client, path, body, headers })).data;
}

export function createSubmitter(client: Client, workspaceId: string): Submit {
  const s: Submitter = {
    client,
    workspaceId,
    uploads: new Map(),
    create: null,
    update: null,
    draft: null,
    schedule: null,
    stale: false,
  };

  return async function submit(input) {
    const accounts = input.destinations.map(({ accountId, variant }) => ({ accountId, variant }));
    let post = await ensureDraft(s, input, accounts);
    const posted = post.destinations.map(({ accountId, variant }) => ({ accountId, variant }));
    try {
      if (s.stale) post = await refresh(s, post);
      if (s.draft !== null) s.draft.post = post;
      if (post.publishSummary !== 'draft') return post;
      const data = await finish(s, post, input);
      s.draft = null;
      s.schedule = null;
      return data;
    } catch (error) {
      if (errorStatus(error) === 409) s.stale = true;
      throw new SubmitError(input.request === null ? 'schedule' : 'request', error, posted);
    }
  };
}
