import type { PublishContext } from '@kronaut/core';
import * as z from 'zod';
import { idField, type Plan, type State } from '../_kit/meta-container-state.ts';
import { graph } from './graph.ts';
import type { Input } from './publish-input.ts';

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

export async function createContainers(
  ctx: PublishContext,
  input: Input,
  plan: Plan,
  initial: State,
): Promise<State> {
  const { item } = plan;
  await ctx.step('create_container');
  let state = initial;
  let form: Record<string, string>;
  const [first] = item.media;
  if (plan.spec.id === 'video') form = await videoForm(ctx, plan);
  else if (first === undefined) form = { media_type: 'TEXT', text: item.text };
  else if (item.media.length === 1)
    form = {
      media_type: 'IMAGE',
      image_url: await ctx.media.signedUrl(first.id),
      ...textField(item.text),
    };
  else {
    state = await createChildren(ctx, input, plan, state);
    const children = state.children ?? {};
    form = {
      media_type: 'CAROUSEL',
      children: item.media.map((ref) => children[ref.id] as string).join(','),
      ...textField(item.text),
    };
  }
  const container = await create(ctx, input, form, state);
  state = { ...state, container: container.id };
  await ctx.checkpoint(state);
  return state;
}
