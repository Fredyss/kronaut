import { type Dispatch, type SetStateAction, useState } from 'react';
import type { Channel } from '../api.ts';
import { choiceFor, type MediaFacts } from './choice.ts';
import {
  type Content,
  type ContentKey,
  type Contents,
  contentOf,
  customize,
  EMPTY_CONTENTS,
  editContent,
  editImages,
  effective,
  reset,
} from './contents.ts';
import type { Doc } from './doc.ts';
import type { OpenedForm } from './from-post.ts';
import { itemSupport, itemsState, postTypeFor } from './items.ts';
import { useImages } from './use-images.ts';
import { useMedia } from './use-media.ts';
import { useVideos, type VideosState } from './use-video.ts';

function videoIds(contents: Contents): string[] {
  const all: Content[] = [contents.base, ...contents.customized.values()];
  return [...new Set(all.flatMap((content) => (content.video === null ? [] : [content.video.id])))];
}

type Edit = (change: (content: Content) => Content) => void;

function useContentMedia(
  content: Content,
  edit: Edit,
  setContents: Dispatch<SetStateAction<Contents>>,
  videos: VideosState,
) {
  const images = useImages({
    images: content.images,
    edit: (change) => edit((c) => ({ ...c, images: change(c.images) })),
    setThumb: (id, thumb) =>
      setContents((current) =>
        editImages(current, (image) => (image.id === id ? { ...image, thumb } : image)),
      ),
  });
  return useMedia({
    images,
    video: content.video?.id ?? null,
    videoAlt: content.video?.altText ?? '',
    videos,
    setVideo: (id) => edit((c) => ({ ...c, video: id === null ? null : { id, altText: '' } })),
    setVideoAlt: (altText) =>
      edit((c) => (c.video === null ? c : { ...c, video: { ...c.video, altText } })),
  });
}

export function useContents(
  workspaceId: string,
  list: readonly Channel[],
  selected: ReadonlySet<string>,
  seed?: OpenedForm,
) {
  const [contents, setContents] = useState<Contents>(seed?.contents ?? EMPTY_CONTENTS);
  const [active, setActive] = useState<ContentKey>(null);
  const videos = useVideos(workspaceId, videoIds(contents), seed?.videos);
  const mediaFor = (channelId: string): MediaFacts => {
    const content = effective(contents, channelId);
    return { images: content.images.map((image) => image.facts), video: content.video !== null };
  };
  const choiceOf = (channel: Channel) => choiceFor(channel, mediaFor(channel.id));
  const tabs = list.filter(
    (channel) =>
      selected.has(channel.id) &&
      (choiceOf(channel).kind === 'ok' || contents.customized.has(channel.id)),
  );
  const stored = seed?.stored;
  const keeps = (id: string) => contents.customized.has(id) || stored?.has(id) === true;
  const shown = active !== null && tabs.some((channel) => channel.id === active) ? active : null;
  if (shown !== active) setActive(shown);
  const target = shown !== null && contents.customized.has(shown) ? shown : null;
  const content = contentOf(contents, target) ?? contents.base;
  const edit: Edit = (change) => setContents((current) => editContent(current, target, change));

  const media = useContentMedia(content, edit, setContents, videos);
  const scope = list.filter((channel) =>
    target === null ? selected.has(channel.id) : channel.id === target,
  );
  const support = itemSupport(scope.map((channel) => postTypeFor(channel, mediaFor(channel.id))));

  return {
    contents,
    tabs,
    active: shown,
    select: setActive,
    editing: shown === null || target !== null,
    doc: content.doc,
    setDoc: (doc: Doc) => edit((c) => ({ ...c, doc })),
    customize: (channelId: string) => setContents((current) => customize(current, channelId)),
    reset: (channelId: string) => setContents((current) => reset(current, channelId)),
    media,
    items: itemsState(content, edit, support),
    videos: videos.entries,
    mediaFor,
    choiceOf,
    unusable: list
      .filter(({ id }) => selected.has(id) && keeps(id))
      .filter((channel) => choiceOf(channel).kind !== 'ok')
      .map(({ id }) => id),
  };
}

export type ContentsState = ReturnType<typeof useContents>;
