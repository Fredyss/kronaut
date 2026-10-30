import {
  isProviderFailure,
  type PostTypeSpec,
  ProviderFailure,
  type PublishContext,
  type PublishOutcome,
  type VerifyOutcome,
} from '@kronaut/core';
import { Temporal } from 'temporal-polyfill';
import * as z from 'zod';
import { readJson, send } from './http.ts';
import {
  dropContainer,
  idField,
  type MetaInput,
  type Plan,
  parseState,
  publishState,
  type State,
} from './meta-container-state.ts';
import { type MetaGraph, NotReady } from './meta-graph-call.ts';
import type { Recovered } from './meta-recover.ts';
import { afterSend, beginPublicSend } from './public-send.ts';

const FINISHED_LAG = Temporal.Duration.from({ minutes: 2 });

const published = z.looseObject({ id: idField });
const permalinkOnly = z.looseObject({ permalink: z.url().optional() });

export interface ContainerStatus {
  readonly code: string;
  readonly detail?: string | null | undefined;
}

export interface ContainerApi<I extends MetaInput> {
  readonly graph: MetaGraph;
  readonly statusFields: string;
  readonly status: z.ZodType<ContainerStatus>;
  readonly publishPath: string;
  readonly settleMs?: number;
  create(ctx: PublishContext, input: I, plan: Plan, state: State): Promise<State>;
  recover(
    ctx: PublishContext,
    input: I,
    sentAt: string | undefined,
  ): Promise<Recovered | undefined>;
  statusFailure(status: ContainerStatus): ProviderFailure;
  retryableStatus(status: ContainerStatus): boolean;
  beforePublish?(ctx: PublishContext, input: I): Promise<void>;
  afterPublish?(ctx: PublishContext, result: Readonly<Record<string, unknown>>): void;
}

interface Job<I extends MetaInput> {
  readonly ctx: PublishContext;
  readonly api: ContainerApi<I>;
  readonly input: I;
}

interface ContainerCheck {
  readonly state: State;
  readonly container: string;
  readonly status: ContainerStatus;
  readonly fresh: boolean;
}

function pending(spec: PostTypeSpec): PublishOutcome {
  return { kind: 'pending', pollAfterMs: spec.async?.pollIntervalMs ?? 60_000 };
}

function withUrl(found: Recovered): { readonly url?: string } {
  return found.url === undefined ? {} : { url: found.url };
}

function readStatus<I extends MetaInput>(
  { ctx, api, input }: Job<I>,
  container: string,
  state: State,
): Promise<ContainerStatus> {
  return api.graph.call(ctx, {
    effect: 'private',
    url: api.graph.versioned(container, input, { fields: api.statusFields }),
    schema: api.status,
    state,
  });
}

function permalinkOf<I extends MetaInput>(
  { ctx, api, input }: Job<I>,
  id: string,
): Promise<string | undefined> {
  return afterSend(async () => {
    const url = api.graph.versioned(id, input, { fields: 'permalink' });
    const response = await send(ctx, 'none', url, { headers: { accept: 'application/json' } });
    if (response.status !== 200) return undefined;
    return (await readJson(response, permalinkOnly, 'none')).permalink;
  });
}

async function publishContainer<I extends MetaInput>(
  job: Job<I>,
  state: State,
  container: string,
): Promise<PublishOutcome> {
  const { ctx, api, input } = job;
  await api.beforePublish?.(ctx, input);
  const sent = await beginPublicSend(ctx, 'publish_container', state);
  const result = await api.graph.call(ctx, {
    effect: 'public',
    url: api.graph.versioned(`${input.credentials.userId}/${api.publishPath}`, input),
    schema: published,
    form: { creation_id: container },
    state: sent,
  });
  api.afterPublish?.(ctx, result);
  const url = await permalinkOf(job, result.id);
  return { kind: 'published', remoteId: result.id, ...(url === undefined ? {} : { url }) };
}

async function recoverPublished<I extends MetaInput>(
  { ctx, api, input }: Job<I>,
  state: State,
): Promise<PublishOutcome> {
  const found = await api.recover(ctx, input, state.sentAt).catch((error) => {
    if (isProviderFailure(error)) return undefined;
    throw error;
  });
  if (found === undefined) {
    // The container is live, so mark this attempt as sent; an ambiguous failure without a public step would be retried as safe.
    await ctx.step('publish_container');
    throw new ProviderFailure({ kind: 'ambiguous', detail: 'media_unrecovered' });
  }
  return { kind: 'published', remoteId: found.id, ...withUrl(found) };
}

async function proceed<I extends MetaInput>(
  job: Job<I>,
  plan: Plan,
  { state, container, status, fresh }: ContainerCheck,
): Promise<PublishOutcome | State> {
  switch (status.code) {
    case 'PUBLISHED':
      return recoverPublished(job, state);
    case 'IN_PROGRESS':
      return pending(plan.spec);
    case 'FINISHED':
      return publishContainer(job, state, container);
    case 'EXPIRED':
    case 'ERROR': {
      if (status.code === 'ERROR' && !job.api.retryableStatus(status))
        throw job.api.statusFailure(status);
      const next = await dropContainer(job.ctx, state);
      if (fresh)
        throw new ProviderFailure({ kind: 'transient', detail: `container_${status.code}` });
      return next;
    }
    default:
      throw new ProviderFailure({ kind: 'transient', detail: 'container_status_unknown' });
  }
}

async function run<I extends MetaInput>(job: Job<I>, plan: Plan): Promise<PublishOutcome> {
  const { ctx, api, input } = job;
  let state = parseState(input.state);
  if (state.container !== undefined) {
    const { container } = state;
    const status = await readStatus(job, container, state);
    const next = await proceed(job, plan, { state, container, status, fresh: false });
    if ('kind' in next) return next;
    state = next;
  }
  state = await api.create(ctx, input, plan, state);
  if (api.settleMs !== undefined) return { kind: 'pending', pollAfterMs: api.settleMs };
  const container = state.container as string;
  const status = await readStatus(job, container, state);
  const next = await proceed(job, plan, { state, container, status, fresh: true });
  if ('kind' in next) return next;
  throw new ProviderFailure({ kind: 'transient', detail: 'container_recreated' });
}

export async function publishContainers<I extends MetaInput>(
  api: ContainerApi<I>,
  ctx: PublishContext,
  input: I,
  plan: Plan,
): Promise<PublishOutcome> {
  try {
    return await run({ ctx, api, input }, plan);
  } catch (error) {
    if (error instanceof NotReady) return pending(plan.spec);
    throw error;
  }
}

async function verifyStatus<I extends MetaInput>(
  { ctx, api, input }: Job<I>,
  state: State & { readonly container: string },
): Promise<VerifyOutcome> {
  const url = api.graph.versioned(state.container, input, { fields: api.statusFields });
  const response = await send(ctx, 'none', url, { headers: { accept: 'application/json' } });
  if (response.status !== 200) return { kind: 'inconclusive' };
  const status = await readJson(response, api.status, 'none');
  switch (status.code) {
    case 'PUBLISHED': {
      const found = await api.recover(ctx, input, state.sentAt);
      if (found === undefined) return { kind: 'inconclusive' };
      return { kind: 'found', remoteId: found.id, ...withUrl(found) };
    }
    case 'ERROR':
    case 'EXPIRED':
      return { kind: 'absent' };
    case 'FINISHED': {
      if (state.sentAt === undefined) return { kind: 'inconclusive' };
      const settled = Temporal.Instant.from(state.sentAt).add(FINISHED_LAG);
      return Temporal.Instant.compare(ctx.now(), settled) >= 0
        ? { kind: 'absent' }
        : { kind: 'inconclusive' };
    }
    default:
      return { kind: 'inconclusive' };
  }
}

export async function verifyContainer<I extends MetaInput>(
  api: ContainerApi<I>,
  ctx: PublishContext,
  input: I,
): Promise<VerifyOutcome> {
  const parsed = publishState.safeParse(input.state);
  const state = parsed.success ? parsed.data : undefined;
  if (state?.container === undefined) return { kind: 'inconclusive' };
  try {
    return await verifyStatus({ ctx, api, input }, { ...state, container: state.container });
  } catch (error) {
    if (isProviderFailure(error)) return { kind: 'inconclusive' };
    throw error;
  }
}
