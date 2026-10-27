import { useState } from 'react';
import { useLocale } from '../context.ts';
import { m } from '../i18n.ts';
import type { PickedImage } from './contents.ts';
import { fileProblem, MAX_IMAGE_BYTES, MAX_IMAGES, thumbnail } from './media.ts';

type ImageList = readonly PickedImage[];

export interface ImageTarget {
  readonly images: ImageList;
  readonly edit: (change: (images: ImageList) => ImageList) => void;
  readonly setThumb: (id: string, thumb: string) => void;
}

function swap(images: ImageList, index: number, offset: -1 | 1): ImageList {
  const target = index + offset;
  const a = images[index];
  const b = images[target];
  if (a === undefined || b === undefined) return images;
  const next = [...images];
  next[index] = b;
  next[target] = a;
  return next;
}

export function useImages({ images, edit, setThumb }: ImageTarget) {
  const { locale } = useLocale();
  const [problems, setProblems] = useState<readonly string[]>([]);
  const maxSize = new Intl.NumberFormat(locale, {
    style: 'unit',
    unit: 'megabyte',
    maximumFractionDigits: 0,
  }).format(MAX_IMAGE_BYTES / 1024 / 1024);

  const pick = (files: readonly File[]) => {
    const found: string[] = [];
    const accepted: PickedImage[] = [];
    const room = MAX_IMAGES - images.length;
    for (const file of files) {
      const problem = fileProblem(file);
      if (problem === 'type') found.push(m.compose_image_bad_type({ name: file.name }));
      else if (problem === 'size') {
        found.push(m.compose_image_too_big({ name: file.name, max: maxSize }));
      } else if (accepted.length >= room) {
        found.push(m.compose_images_limit({ count: MAX_IMAGES }));
        break;
      } else accepted.push({ id: crypto.randomUUID(), file, thumb: null, altText: '' });
    }
    setProblems(found);
    if (accepted.length === 0) return;
    edit((current) => [...current, ...accepted]);
    for (const image of accepted) {
      void thumbnail(image.file).then((thumb) => {
        if (thumb !== null) setThumb(image.id, thumb);
      });
    }
  };
  const update = (id: string, altText: string) =>
    edit((current) => current.map((item) => (item.id === id ? { ...item, altText } : item)));
  const move = (index: number, offset: -1 | 1) => edit((current) => swap(current, index, offset));
  const remove = (id: string) => edit((current) => current.filter((item) => item.id !== id));
  return { images, problems, maxSize, pick, update, move, remove };
}

export type ImagesState = ReturnType<typeof useImages>;
