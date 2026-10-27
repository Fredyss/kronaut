import { useState } from 'react';
import type { Channel } from '../api.ts';
import { choiceFor } from './choice.ts';
import {
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
import { useImages } from './use-images.ts';

export function useContents(list: readonly Channel[], selected: ReadonlySet<string>) {
  const [contents, setContents] = useState<Contents>(EMPTY_CONTENTS);
  const [active, setActive] = useState<ContentKey>(null);
  const filesFor = (channelId: string) =>
    effective(contents, channelId).images.map((image) => image.file);
  const choiceOf = (channel: Channel) => choiceFor(channel, filesFor(channel.id));
  const tabs = list.filter(
    (channel) =>
      selected.has(channel.id) &&
      (choiceOf(channel).kind === 'ok' || contents.customized.has(channel.id)),
  );
  const shown = active !== null && tabs.some((channel) => channel.id === active) ? active : null;
  if (shown !== active) setActive(shown);
  const target = shown !== null && contents.customized.has(shown) ? shown : null;
  const content = contentOf(contents, target) ?? contents.base;

  const images = useImages({
    images: content.images,
    edit: (change) =>
      setContents((current) =>
        editContent(current, target, (c) => ({ ...c, images: change(c.images) })),
      ),
    setThumb: (id, thumb) =>
      setContents((current) =>
        editImages(current, (image) => (image.id === id ? { ...image, thumb } : image)),
      ),
  });

  return {
    contents,
    tabs,
    active: shown,
    select: setActive,
    editing: shown === null || target !== null,
    doc: content.doc,
    setDoc: (doc: Doc) =>
      setContents((current) => editContent(current, target, (c) => ({ ...c, doc }))),
    customize: (channelId: string) => setContents((current) => customize(current, channelId)),
    reset: (channelId: string) => setContents((current) => reset(current, channelId)),
    images,
    filesFor,
    choiceOf,
    unusable: tabs.filter((channel) => choiceOf(channel).kind !== 'ok').map(({ id }) => id),
  };
}

export type ContentsState = ReturnType<typeof useContents>;
