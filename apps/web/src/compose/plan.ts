import type { Channel, Destination } from '../api.ts';
import { m as composeText } from '../i18n/compose.ts';
import { providerUi } from '../providers.ts';
import { choiceFor } from './choice.ts';
import { type Content, effective } from './contents.ts';
import { isBlank } from './doc.ts';
import { blankItemProblem } from './issues.ts';
import type { ComposeContent, ComposeDestination, ComposeInput } from './submit.ts';
import type { ContentsState } from './use-contents.ts';
import type { VideoRegistry } from './use-video.ts';
import { waitProblem } from './video-text.ts';

export interface Plan {
  readonly destinations: ComposeDestination[];
  readonly variants: { readonly channel: Channel; readonly content: Content }[];
  readonly usesDefault: boolean;
}

type Kept = readonly Destination[];

function kept(stored: Kept, accountId: string, publishType: string) {
  const match = stored.find((d) => d.accountId === accountId);
  if (match === undefined) return {};
  const { deliveryMode, settings } = match;
  return match.publishType === publishType ? { settings, deliveryMode } : { deliveryMode };
}

export function toPlan(
  list: readonly Channel[],
  state: ContentsState,
  selected: ReadonlySet<string>,
  stored: Kept,
): Plan {
  const { contents } = state;
  const plan: Plan = { destinations: [], variants: [], usesDefault: false };
  for (const channel of list) {
    const content = effective(contents, channel.id);
    const choice = choiceFor(channel, state.mediaFor(channel.id));
    if (choice.kind !== 'ok' || !selected.has(channel.id)) continue;
    const custom = contents.customized.has(channel.id);
    if (custom) plan.variants.push({ channel, content });
    const variant = custom ? plan.variants.length - 1 : null;
    const { publishType } = choice;
    const carried = kept(stored, channel.id, publishType);
    plan.destinations.push({ accountId: channel.id, publishType, variant, ...carried });
  }
  return { ...plan, usesDefault: plan.destinations.some((d) => d.variant === null) };
}

export function goneProblem(
  stored: Kept,
  list: readonly Channel[],
  selected: ReadonlySet<string>,
  locale: string,
): string | null {
  const gone = stored
    .filter((d) => selected.has(d.accountId) && !list.some((c) => c.id === d.accountId))
    .map((d) => providerUi(d.provider).name());
  if (gone.length === 0) return null;
  const channels = new Intl.ListFormat(locale).format(gone);
  return composeText.compose_error_channel_gone({ channels });
}

export function isEmpty(content: Content): boolean {
  return isBlank(content.doc) && content.images.length === 0 && content.video === null;
}

function usedContents(plan: Plan, base: Content): Content[] {
  return [...(plan.usesDefault ? [base] : []), ...plan.variants.map((v) => v.content)];
}

export function emptyProblem(plan: Plan, base: Content): string | null {
  if (plan.destinations.length === 0) return composeText.compose_error_no_channel();
  if (plan.usesDefault && isEmpty(base)) return composeText.compose_error_empty();
  const empty = plan.variants.find(({ content }) => isEmpty(content));
  if (empty !== undefined)
    return composeText.compose_error_empty_channel({ channel: empty.channel.displayName });
  for (const content of usedContents(plan, base)) {
    const problem = blankItemProblem(content);
    if (problem !== null) return problem;
  }
  return null;
}

export function videoProblem(plan: Plan, base: Content, videos: VideoRegistry, locale: string) {
  for (const { video } of usedContents(plan, base)) {
    const problem = video === null ? null : waitProblem(videos.get(video.id), locale);
    if (problem !== null) return problem;
  }
  return null;
}

function toCompose(content: Content, videos: VideoRegistry): ComposeContent {
  const { doc, images, video, replies, comment } = content;
  const phase = video === null ? undefined : videos.get(video.id)?.phase;
  return {
    doc,
    replies: replies.map((reply) => ({ doc: reply.doc })),
    comment,
    images: images.map(({ id, file, altText, aiGenerated }) => ({
      id,
      file,
      altText,
      aiGenerated,
    })),
    video:
      video !== null && phase?.kind === 'ready'
        ? { id: phase.asset.id, altText: video.altText }
        : null,
  };
}

export function planInput(
  plan: Plan,
  state: ContentsState,
): Pick<ComposeInput, 'content' | 'variants' | 'destinations'> {
  return {
    content: toCompose(state.contents.base, state.videos),
    variants: plan.variants.map((variant) => toCompose(variant.content, state.videos)),
    destinations: plan.destinations,
  };
}
