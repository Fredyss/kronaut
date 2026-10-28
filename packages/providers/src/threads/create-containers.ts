import type { PublishContext } from '@kronaut/core';
import * as z from 'zod';
import { idField, type Plan, type State } from '../_kit/meta-container-state.ts';
import { graph } from './graph.ts';
import { type Input, replyToId } from './publish-input.ts';

const created = z.looseObject({ id: idField });

function textField(text: string): Record<string, string> {
  return text === '' ? {} : { text };
}

function create(
  ctx: PublishContext,
  input: Input,
  form: Readonly<Record<string, string>>,
  state: State,
): Promise<{ readonly id: string }> {
  return graph.call(ctx, {
    effect: 'private',
    url: graph.versioned(`${input.credentials.userId}/threads`, input),
    schema: created,
    form,
    state,
  });
}

async function createChildren(
  ctx: PublishContext,
  input: Input,
  { item }: Plan,
  initial: State,
): Promise<State> {
  let state = initial;
  const children: Record<string, string> = { ...state.children };
  for (const ref of item.media) {
    if (children[ref.id] !== undefined) continue;
    const form = {
      media_type: 'IMAGE',
      image_url: await ctx.media.signedUrl(ref.id),
      is_carousel_item: 'true',
    };
    children[ref.id] = (await create(ctx, input, form, state)).id;
    state = { ...state, children: { ...children } };
    await ctx.checkpoint(state);
  }
  return state;
}

async function videoForm(ctx: PublishContext, { item }: Plan): Promise<Record<string, string>> {
  const [ref] = item.media;
  if (ref === undefined) throw new Error('threads video has no media');
  const alt = ref.altText ?? '';
  return {
    media_type: 'VIDEO',
    video_url: await ctx.media.signedUrl(ref.id),
    ...textField(item.text),
    ...(alt === '' ? {} : { alt_text: alt }),
  };
}

async function mainForm(
  ctx: PublishContext,
  input: Input,
  plan: Plan,
  initial: State,
): Promise<{ readonly form: Record<string, string>; readonly state: State }> {
  const { item } = plan;
  const [first] = item.media;
  if (plan.spec.id === 'video') return { form: await videoForm(ctx, plan), state: initial };
  if (first === undefined) return { form: { media_type: 'TEXT', text: item.text }, state: initial };
  if (item.media.length === 1)
    return {
      form: {
        media_type: 'IMAGE',
        image_url: await ctx.media.signedUrl(first.id),
        ...textField(item.text),
      },
      state: initial,
    };
  const state = await createChildren(ctx, input, plan, initial);
  const children = state.children ?? {};
  return {
    form: {
      media_type: 'CAROUSEL',
      children: item.media.map((ref) => children[ref.id] as string).join(','),
      ...textField(item.text),
    },
    state,
  };
}

export async function createContainers(
  ctx: PublishContext,
  input: Input,
  plan: Plan,
  initial: State,
): Promise<State> {
  await ctx.step('create_container');
  const replyTo = replyToId(input);
  const { form, state } =
    replyTo === undefined
      ? await mainForm(ctx, input, plan, initial)
      : {
          form: { media_type: 'TEXT', text: plan.item.text, reply_to_id: replyTo },
          state: initial,
        };
  const container = await create(ctx, input, form, state);
  const next = { ...state, container: container.id };
  await ctx.checkpoint(next);
  return next;
}
