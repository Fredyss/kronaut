import type { MediaRef, PublishContext, PublishItem } from '@kronaut/core';
import * as z from 'zod';
import { idField, type Plan, type State } from '../_kit/meta-container-state.ts';
import { graph } from './graph-call.ts';
import { permanent } from './oauth.ts';
import type { Input } from './publish-input.ts';

const created = z.looseObject({ id: idField });

export function sentAltText(ref: MediaRef | undefined): string | undefined {
  const text = ref?.altText;
  return text === undefined || text === '' ? undefined : text;
}

function captionField(text: string): Record<string, string> {
  return text === '' ? {} : { caption: text };
}

function aiFlag(media: readonly MediaRef[]): Record<string, string> {
  return media.some((ref) => ref.aiGenerated) ? { is_ai_generated: 'true' } : {};
}

function altField(ref: MediaRef): Record<string, string> {
  const alt = sentAltText(ref);
  return alt === undefined ? {} : { alt_text: alt };
}

async function singleForm(
  ctx: PublishContext,
  item: PublishItem,
  reel: boolean,
): Promise<Record<string, string>> {
  const [ref] = item.media;
  if (ref === undefined) throw permanent('too_few_images');
  const url = await ctx.media.signedUrl(ref.id);
  const media = reel
    ? { media_type: 'REELS', video_url: url, share_to_feed: 'true' }
    : { image_url: url };
  return {
    ...media,
    ...captionField(item.text),
    ...(reel ? {} : altField(ref)),
    ...aiFlag(item.media),
  };
}

async function carouselForm(
  ctx: PublishContext,
  input: Input,
  item: PublishItem,
  initial: State,
): Promise<{ form: Record<string, string>; state: State }> {
  let state = initial;
  await ctx.step('create_children');
  const children: Record<string, string> = { ...state.children };
  for (const ref of item.media) {
    if (children[ref.id] !== undefined) continue;
    const child = await graph.call(ctx, {
      effect: 'private',
      url: graph.versioned(`${input.credentials.userId}/media`, input),
      schema: created,
      form: {
        image_url: await ctx.media.signedUrl(ref.id),
        is_carousel_item: 'true',
        ...altField(ref),
      },
      state,
    });
    children[ref.id] = child.id;
    state = { ...state, children: { ...children } };
    await ctx.checkpoint(state);
  }
  const form = {
    media_type: 'CAROUSEL',
    children: item.media.map((ref) => children[ref.id] as string).join(','),
    ...captionField(item.text),
    ...aiFlag(item.media),
  };
  return { form, state };
}

export async function createContainers(
  ctx: PublishContext,
  input: Input,
  plan: Plan,
  initial: State,
): Promise<State> {
  const { item, spec } = plan;
  let state = initial;
  let parent: Record<string, string>;
  if (spec.id === 'carousel') {
    ({ form: parent, state } = await carouselForm(ctx, input, item, state));
  } else {
    parent = await singleForm(ctx, item, spec.id === 'reel');
  }
  await ctx.step('create_container');
  const container = await graph.call(ctx, {
    effect: 'private',
    url: graph.versioned(`${input.credentials.userId}/media`, input),
    schema: created,
    form: parent,
    state,
  });
  state = { ...state, container: container.id };
  await ctx.checkpoint(state);
  return state;
}
