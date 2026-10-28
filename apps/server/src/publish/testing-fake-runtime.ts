import {
  ProviderFailure,
  type ProviderRuntime,
  type PublishContext,
  type PublishInput,
  type PublishOutcome,
  type VerifyOutcome,
} from '@kronaut/core';
import type {
  FakeBehaviour,
  FakeCall,
  FakePoll,
  FakeRefresh,
  FakeRefreshCall,
  FakeVerify,
} from './testing-fake.ts';

export interface FakeQueues {
  readonly calls: FakeCall[];
  readonly checks: FakeCall[];
  readonly queue: FakeBehaviour[];
  readonly verifyQueue: FakeVerify[];
  readonly pollQueue: FakePoll[];
  readonly refreshes: FakeRefreshCall[];
  readonly refreshQueue: FakeRefresh[];
}

type SendBehaviour = Exclude<FakeBehaviour, { kind: 'pending' }>;

function record(log: FakeCall[], input: PublishInput<unknown, unknown>, events: string[]): void {
  log.push({
    attemptNo: input.attemptNo,
    positions: input.items.map((item) => item.position),
    chain: input.chain ?? [],
    state: input.state,
    credentials: input.credentials,
    events,
  });
}

async function publicStep(ctx: PublishContext, events: string[]): Promise<void> {
  try {
    await ctx.step('publish');
  } catch (err) {
    events.push('refused');
    throw err;
  }
  events.push('public');
}

async function upload(ctx: PublishContext, behaviour: FakeBehaviour, events: string[]) {
  await ctx.step('upload');
  events.push('upload');
  if ('checkpoint' in behaviour && behaviour.checkpoint !== undefined) {
    await ctx.checkpoint(behaviour.checkpoint);
    events.push('checkpoint');
  }
}

async function send(
  ctx: PublishContext,
  behaviour: SendBehaviour,
  input: PublishInput<unknown, unknown>,
  events: string[],
): Promise<PublishOutcome> {
  if ('beforePublic' in behaviour) await behaviour.beforePublic?.();
  if (behaviour.kind === 'fail' && behaviour.at === 'before_public') {
    throw new ProviderFailure(behaviour.error);
  }
  await publicStep(ctx, events);
  if (behaviour.kind === 'fail') {
    await behaviour.afterPublic?.();
    throw new ProviderFailure(behaviour.error);
  }
  if (behaviour.kind === 'crash_after_public') {
    await ctx.step('upload');
    throw new Error('fake provider crashed');
  }
  await behaviour.afterPublic?.();
  return {
    kind: 'published',
    remoteId: behaviour.remoteId ?? `fake:${input.destinationId}`,
    ...(behaviour.url === undefined ? {} : { url: behaviour.url }),
    ...(behaviour.anchor === undefined ? {} : { anchor: behaviour.anchor }),
  };
}

export async function fakePublish(
  q: FakeQueues,
  ctx: PublishContext,
  input: PublishInput<unknown, unknown>,
): Promise<PublishOutcome> {
  const events: string[] = [];
  record(q.calls, input, events);
  const behaviour = q.queue.shift();
  if (behaviour === undefined) throw new Error('fake provider has no scripted behaviour');
  await upload(ctx, behaviour, events);
  if (behaviour.kind === 'pending') {
    if (behaviour.afterPublic === true) {
      await ctx.step('publish');
      events.push('public');
    }
    return { kind: 'pending', pollAfterMs: behaviour.pollAfterMs };
  }
  return await send(ctx, behaviour, input, events);
}

export async function fakeVerify(
  q: FakeQueues,
  ctx: PublishContext,
  input: PublishInput<unknown, unknown>,
): Promise<VerifyOutcome> {
  const events: string[] = [];
  record(q.checks, input, events);
  const behaviour = q.verifyQueue.shift();
  if (behaviour === undefined) throw new Error('fake provider has no scripted verify');
  if (behaviour.kind === 'throw') {
    throw behaviour.error === undefined
      ? new Error('fake verifier crashed')
      : new ProviderFailure(behaviour.error);
  }
  if (behaviour.kind === 'public_step') {
    await publicStep(ctx, events);
    return { kind: 'found', remoteId: `fake:${input.destinationId}` };
  }
  await behaviour.during?.();
  return behaviour;
}

export function fakePoll(q: FakeQueues): NonNullable<ProviderRuntime['poll']> {
  return async (_ctx, input) => {
    record(q.checks, input, ['poll']);
    const behaviour = q.pollQueue.shift();
    if (behaviour === undefined) throw new Error('fake provider has no scripted poll');
    return behaviour;
  };
}

export function fakeRefresh(q: FakeQueues): NonNullable<ProviderRuntime['refresh']> {
  return async (_ctx, input) => {
    const { signingKey } = input.app;
    q.refreshes.push({
      account: input.account,
      credentials: input.credentials,
      ...(signingKey === undefined ? {} : { signingKey }),
    });
    const behaviour = q.refreshQueue.shift();
    if (behaviour === undefined) throw new Error('fake provider has no scripted refresh');
    await behaviour.during?.();
    if (behaviour.kind === 'fail') throw new ProviderFailure(behaviour.error);
    if (behaviour.kind === 'throw') throw new Error('fake refresh crashed');
    return behaviour.issued;
  };
}
