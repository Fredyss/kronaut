import { type Doc, EMPTY_DOC } from './doc.ts';

export interface PickedImage {
  readonly id: string;
  readonly file: File;
  readonly thumb: string | null;
  readonly altText: string;
}

export interface Content {
  readonly doc: Doc;
  readonly images: readonly PickedImage[];
}

export interface Contents {
  readonly base: Content;
  readonly customized: ReadonlyMap<string, Content>;
}

export type ContentKey = string | null;

export const EMPTY_CONTENTS: Contents = {
  base: { doc: EMPTY_DOC, images: [] },
  customized: new Map(),
};

export function customize(contents: Contents, channelId: string): Contents {
  if (contents.customized.has(channelId)) return contents;
  const copy: Content = {
    doc: contents.base.doc,
    images: contents.base.images.map((image) => ({ ...image })),
  };
  return { ...contents, customized: new Map(contents.customized).set(channelId, copy) };
}

export function reset(contents: Contents, channelId: string): Contents {
  if (!contents.customized.has(channelId)) return contents;
  const customized = new Map(contents.customized);
  customized.delete(channelId);
  return { ...contents, customized };
}

export function effective(contents: Contents, channelId: string): Content {
  return contents.customized.get(channelId) ?? contents.base;
}

export function contentOf(contents: Contents, key: ContentKey): Content | undefined {
  return key === null ? contents.base : contents.customized.get(key);
}

export function editContent(
  contents: Contents,
  key: ContentKey,
  edit: (content: Content) => Content,
): Contents {
  if (key === null) return { ...contents, base: edit(contents.base) };
  const current = contents.customized.get(key);
  if (current === undefined) return contents;
  return { ...contents, customized: new Map(contents.customized).set(key, edit(current)) };
}

export function editImages(
  contents: Contents,
  edit: (image: PickedImage) => PickedImage,
): Contents {
  const apply = (content: Content): Content => ({ ...content, images: content.images.map(edit) });
  const customized = new Map<string, Content>();
  for (const [key, content] of contents.customized) customized.set(key, apply(content));
  return { base: apply(contents.base), customized };
}

export interface FirstUse<T> {
  readonly image: T;
  readonly content: number;
  readonly index: number;
}

export function distinctImages<T extends { readonly id: string }>(
  lists: readonly (readonly T[])[],
): FirstUse<T>[] {
  const seen = new Map<string, FirstUse<T>>();
  for (const [content, images] of lists.entries()) {
    for (const [index, image] of images.entries()) {
      if (!seen.has(image.id)) seen.set(image.id, { image, content, index });
    }
  }
  return [...seen.values()];
}
