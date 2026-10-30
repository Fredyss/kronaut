import {
  type Client,
  type PostsCreateData,
  postsCreate,
  postsRequestApproval,
  postsSchedule,
  postsUpdate,
} from '@kronaut/sdk';
import { type Destination, errorStatus, type Post } from '../api.ts';
import { approvalBody } from '../approvals/queries.ts';
import { idempotency, type Keyed, keyFor } from '../idempotency.ts';
import type { Repeat } from '../series/rule-text.ts';
import type { Doc } from './doc.ts';
import { type DraftBody, draftBody } from './draft-body.ts';
import { SubmitError, type SubmitTarget } from './submit-error.ts';
import { type UploadCache, uploadMedia } from './submit-media.ts';
import { isScheduled, moveOpened, refresh, settlePending, unschedule } from './submit-opened.ts';

export interface ComposeImage {
  readonly id: string;
  readonly file: File | null;
  readonly altText: string;
  readonly aiGenerated: boolean;
}

export interface ComposeContent {
  readonly doc: Doc;
  readonly images: readonly ComposeImage[];
  readonly video: { readonly id: string; readonly altText: string } | null;
  readonly replies: readonly { readonly doc: Doc }[];
  readonly comment: { readonly doc: Doc } | null;
}

export interface ComposeDestination {
  readonly accountId: string;
  readonly publishType: string;
  readonly variant: number | null;
  readonly settings?: Destination['settings'];
  readonly deliveryMode?: Destination['deliveryMode'];
}

export type ScheduleWhen =
  | { readonly mode: 'asap' }
  | { readonly mode: 'queue' }
  | {
      readonly mode: 'instant';
      readonly scheduleLocal: string;
      readonly scheduleTz: string;
      readonly repeat?: Repeat;
    };

export type ComposeWhen = { readonly mode: 'draft' } | ScheduleWhen;

export interface ComposeInput {
  readonly content: ComposeContent;
  readonly variants: readonly ComposeContent[];
  readonly destinations: readonly ComposeDestination[];
  readonly when: ComposeWhen;
  readonly request: { readonly note: string } | null;
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

interface NextDraft {
  readonly body: DraftBody;
  readonly fingerprint: string;
}

export interface OpenedPost {
  readonly post: Post;
  readonly fingerprint: string;
}

export interface Submitter {
  readonly client: Client;
  readonly workspaceId: string;
  readonly uploads: UploadCache;
  readonly opened: boolean;
  create: PendingCreate | null;
  update: Keyed | null;
  draft: { readonly fingerprint: string; post: Post } | null;
  unschedule: Keyed | null;
  unscheduled: boolean;
  schedule: Keyed | null;
  refusedMove: string | null;
  stale: boolean;
}

async function ensureDraft(
  s: Submitter,
  next: NextDraft,
  accounts: readonly SubmitTarget[],
): Promise<Post> {
  const { body, fingerprint } = next;
  if (s.opened && s.draft !== null && isScheduled(s.draft.post)) {
    s.draft.post = await unschedule(s, s.draft.post, accounts);
  }
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
      if (errorStatus(error) !== 409 || attempt > 0 || s.opened) throw error;
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
    if (errorStatus(error) === 409 && !s.opened) s.stale = true;
    throw new SubmitError('update', error, accounts);
  }
}

async function finish(
  s: Submitter,
  post: Post,
  when: ScheduleWhen,
  request: ComposeInput['request'],
): Promise<Post> {
  const path = { workspaceId: s.workspaceId, postId: post.id };
  if (request !== null) {
    const body = approvalBody(post.version, when, request.note);
    s.schedule = keyFor(s.schedule, JSON.stringify({ postId: post.id, request: body }));
    const headers = idempotency(s.schedule);
    return (await postsRequestApproval({ client: s.client, path, body, headers })).data;
  }
  const body = { expectedVersion: post.version, ...when };
  s.schedule = keyFor(s.schedule, JSON.stringify({ postId: post.id, body }));
  const headers = idempotency(s.schedule);
  return (await postsSchedule({ client: s.client, path, body, headers })).data;
}

async function publish(s: Submitter, input: ComposeInput): Promise<Post> {
  const accounts = input.destinations.map(({ accountId, variant }) => ({ accountId, variant }));
  const body = draftBody(input, await uploadMedia(s, input, accounts));
  const next = { body, fingerprint: JSON.stringify(body) };
  const { when } = input;
  await settlePending(s, when, accounts);
  const moved = await moveOpened(s, input, next.fingerprint, accounts);
  if (moved !== null) return moved;
  let post = await ensureDraft(s, next, accounts);
  if (when.mode === 'draft') return post;
  const posted = post.destinations.map(({ accountId, variant }) => ({ accountId, variant }));
  try {
    if (s.stale) post = await refresh(s, post);
    if (s.draft !== null) s.draft.post = post;
    if (!s.opened && post.publishSummary !== 'draft') return post;
    const data = await finish(s, post, when, input.request);
    s.draft = null;
    s.schedule = null;
    return data;
  } catch (error) {
    if (errorStatus(error) === 409 && !s.opened) s.stale = true;
    throw new SubmitError(input.request === null ? 'schedule' : 'request', error, posted);
  }
}

// A post canceled everywhere only returns to draft through a PATCH, and schedule skips it otherwise.
function openedDraft({ post, fingerprint }: OpenedPost) {
  const canceled = post.destinations.every((destination) => destination.state === 'canceled');
  return { fingerprint: canceled ? '' : fingerprint, post };
}

export function createSubmitter(client: Client, workspaceId: string, opened?: OpenedPost): Submit {
  const s: Submitter = {
    client,
    workspaceId,
    uploads: new Map(),
    opened: opened !== undefined,
    create: null,
    update: null,
    draft: opened === undefined ? null : openedDraft(opened),
    unschedule: null,
    unscheduled: false,
    schedule: null,
    refusedMove: null,
    stale: false,
  };

  return async function submit(input) {
    try {
      return await publish(s, input);
    } catch (error) {
      if (error instanceof SubmitError) error.unscheduled = s.unscheduled;
      throw error;
    }
  };
}
