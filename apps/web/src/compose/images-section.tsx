import { buttonVariants } from '@kronaut/ui';
import type { ChangeEvent } from 'react';
import { m } from '../i18n.ts';
import { ImageRow } from './image-row.tsx';
import { IMAGE_TYPES, MAX_IMAGES } from './media.ts';
import type { ImagesState } from './use-images.ts';

interface ImagesSectionProps {
  readonly fileId: string;
  readonly images: ImagesState;
  readonly pending: boolean;
}

export function ImagesSection({ fileId, images: state, pending }: ImagesSectionProps) {
  const { images, problems, maxSize, pick, update, move, remove } = state;
  const onFiles = (event: ChangeEvent<HTMLInputElement>) => {
    pick([...(event.currentTarget.files ?? [])]);
    event.currentTarget.value = '';
  };

  return (
    <section className="flex flex-col gap-3" aria-labelledby={`${fileId}-title`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={`${fileId}-title`} className="font-medium text-sm">
          {m.compose_images_title()}
        </h2>
        <input
          id={fileId}
          type="file"
          accept={IMAGE_TYPES.join(',')}
          multiple
          className="peer sr-only"
          disabled={pending || images.length >= MAX_IMAGES}
          onChange={onFiles}
        />
        <label
          htmlFor={fileId}
          className={buttonVariants({
            variant: 'outline',
            size: 'sm',
            className:
              'cursor-pointer peer-focus-visible:ring-[3px] peer-focus-visible:ring-ring/50 peer-disabled:pointer-events-none peer-disabled:opacity-50',
          })}
        >
          {m.compose_images_add()}
        </label>
      </div>
      <p className="text-muted-foreground text-xs">
        {m.compose_images_hint({ count: MAX_IMAGES, max: maxSize })}
      </p>
      {problems.length === 0 ? null : (
        <ul role="alert" className="list-disc pl-5 text-destructive text-sm">
          {problems.map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
      )}
      {images.length === 0 ? null : (
        <ol className="flex flex-col gap-2">
          {images.map((image, index) => (
            <ImageRow
              key={image.id}
              image={image}
              index={index}
              count={images.length}
              disabled={pending}
              onAlt={(value) => update(image.id, value)}
              onMove={(offset) => move(index, offset)}
              onRemove={() => remove(image.id)}
            />
          ))}
        </ol>
      )}
    </section>
  );
}
