import { effective } from './contents.ts';
import { itemDocs } from './items.ts';
import type { PreviewTarget } from './preview/preview.tsx';
import type { LimitTarget } from './text-limits.tsx';
import type { ContentsState } from './use-contents.ts';

function videoOf(state: ContentsState, channelId: string) {
  const { video } = effective(state.contents, channelId);
  return video === null ? undefined : state.videos.get(video.id);
}

export function limitTargets(state: ContentsState): LimitTarget[] {
  const { contents, tabs, active } = state;
  return tabs.map((channel) => {
    const content = effective(contents, channel.id);
    const phase = videoOf(state, channel.id)?.phase;
    return {
      channel,
      doc: content.doc,
      media: state.mediaFor(channel.id),
      video: phase?.kind === 'ready' ? phase.asset : null,
      shown: active === null ? !contents.customized.has(channel.id) : channel.id === active,
      items: itemDocs(content),
    };
  });
}

export function previewTargets(state: ContentsState): PreviewTarget[] {
  return limitTargets(state).flatMap(({ channel, doc, shown }) => {
    const choice = state.choiceOf(channel);
    if (!shown || choice.kind !== 'ok') return [];
    const { images } = effective(state.contents, channel.id);
    const entry = videoOf(state, channel.id);
    const video = entry?.url ?? null;
    const poster = entry?.poster ?? null;
    return [{ channel, doc, images, video, poster, publishType: choice.publishType }];
  });
}
