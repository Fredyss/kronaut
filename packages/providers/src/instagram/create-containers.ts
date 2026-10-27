import type { MediaRef, PublishContext } from '@kronaut/core';
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

export async function createContainers(
  ctx: PublishContext,
  input: Input,
  plan: Plan,
  initial: State,
): Promise<State> {
  const { item, spec } = plan;
  let state = initial;
  const mediaPath = `${input.credentials.userId}/media`;
  let parent: Record<string, string>;
  if (spec.id === 'carousel') {
    await ctx.step('create_children');
    const children: Record<string, string> = { ...state.children };
    for (const ref of item.media) {
      if (children[ref.id] !== undefined) continue;
      const child = await graph.call(ctx, {
        effect: 'private',
        url: graph.versioned(mediaPath, input),
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
    parent = {
      media_type: 'CAROUSEL',
      children: item.media.map((ref) => children[ref.id] as string).join(','),
      ...captionField(item.text),
      ...aiFlag(item.media),
    };
  } else {
    const [ref] = item.media;
    if (ref === undefined) throw permanent('too_few_images');
    parent = {
      image_url: await ctx.media.signedUrl(ref.id),
      ...captionField(item.text),
      ...altField(ref),
      ...aiFlag(item.media),
    };
  }
  await ctx.step('create_container');
  const container = await graph.call(ctx, {
    effect: 'private',
    url: graph.versioned(mediaPath, input),
    schema: created,
    form: parent,
    state,
  });
  state = { ...state, container: container.id };
  await ctx.checkpoint(state);
  return state;
}
