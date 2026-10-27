import { describe, expect, it } from 'vitest';
import {
  type Contents,
  customize,
  distinctImages,
  EMPTY_CONTENTS,
  editContent,
  editImages,
  effective,
  type PickedImage,
  reset,
} from './contents.ts';
import { type Doc, textToParagraphs } from './doc.ts';

function doc(text: string): Doc {
  return { type: 'doc', content: textToParagraphs(text) };
}

function image(id: string, altText = ''): PickedImage {
  const file = new File([id], `${id}.jpg`, { type: 'image/jpeg' });
  return { id, file, thumb: null, altText, aiGenerated: false };
}

const BASE: Contents = {
  ...EMPTY_CONTENTS,
  base: { doc: doc('Hello everyone'), images: [image('a', 'A cat')], video: null },
};

describe('contents', () => {
  it('customizes a channel with a copy of the default content', () => {
    const next = customize(BASE, 'acct_bsky');
    const copy = next.customized.get('acct_bsky');
    expect(copy?.doc).toEqual(BASE.base.doc);
    expect(copy?.images).toEqual(BASE.base.images);
    expect(copy?.images[0]).not.toBe(BASE.base.images[0]);
    expect(copy?.images[0]?.file).toBe(BASE.base.images[0]?.file);
  });

  it('edits a customized content without touching the default', () => {
    const next = editContent(customize(BASE, 'acct_bsky'), 'acct_bsky', (content) => ({
      ...content,
      doc: doc('Hi'),
      images: content.images.map((item) => ({ ...item, altText: 'A small cat' })),
    }));
    expect(next.base).toBe(BASE.base);
    expect(effective(next, 'acct_bsky').doc).toEqual(doc('Hi'));
    expect(effective(next, 'acct_bsky').images[0]?.altText).toBe('A small cat');
    expect(next.base.images[0]?.altText).toBe('A cat');
  });

  it('shares the default video with a customized copy', () => {
    const withVideo = { ...BASE, base: { ...BASE.base, images: [], video: { id: 'v1' } } };
    expect(effective(customize(withVideo, 'acct_ig'), 'acct_ig').video).toEqual({ id: 'v1' });
  });

  it('resets a channel to the default content', () => {
    const next = reset(customize(BASE, 'acct_bsky'), 'acct_bsky');
    expect(next.customized.has('acct_bsky')).toBe(false);
    expect(effective(next, 'acct_bsky')).toBe(BASE.base);
  });

  it('keeps the content of a channel that is not customized or not selected', () => {
    const custom = editContent(customize(BASE, 'acct_bsky'), 'acct_bsky', (c) => ({
      ...c,
      doc: doc('Short'),
    }));
    const unrelated = editContent(custom, 'acct_ig', (c) => ({ ...c, doc: doc('Ignored') }));
    expect(unrelated).toBe(custom);
    expect(effective(custom, 'acct_bsky').doc).toEqual(doc('Short'));
    expect(effective(custom, 'acct_ig')).toBe(custom.base);
  });

  it('updates an image in every content that holds it', () => {
    const next = editImages(customize(BASE, 'acct_bsky'), (item) =>
      item.id === 'a' ? { ...item, thumb: 'data:image/jpeg;base64,AA==' } : item,
    );
    expect(next.base.images[0]?.thumb).toBe('data:image/jpeg;base64,AA==');
    expect(effective(next, 'acct_bsky').images[0]?.thumb).toBe('data:image/jpeg;base64,AA==');
  });

  it('collects distinct images across contents', () => {
    const next = editContent(customize(BASE, 'acct_bsky'), 'acct_bsky', (c) => ({
      ...c,
      images: [...c.images, image('b')],
    }));
    const lists = [next.base.images, effective(next, 'acct_bsky').images];
    expect(
      distinctImages(lists).map(({ image: { id }, content, index }) => [id, content, index]),
    ).toEqual([
      ['a', 0, 0],
      ['b', 1, 1],
    ]);
  });
});
