import { buttonVariants } from '@kronaut/ui';
import type { ChangeEvent } from 'react';
import { m as composeText } from '../i18n/compose.ts';
import { ImageRow } from './image-row.tsx';
import { IMAGE_TYPES, MAX_IMAGES, VIDEO_TYPES } from './media.ts';
import type { MediaState } from './use-media.ts';
import { VideoRow } from './video-row.tsx';

interface ImagesSectionProps {
  readonly fileId: string;
  readonly media: MediaState;
  readonly pending: boolean;
}

const ACCEPT = [...IMAGE_TYPES, ...VIDEO_TYPES].join(',');

export function ImagesSection({ fileId, media, pending }: ImagesSectionProps) {
  const { problems, pick, video, maxVideoSize } = media;
  const { images, maxSize, update, move, remove } = media.images;
  const onFiles = (event: ChangeEvent<HTMLInputElement>) => {
    pick([...(event.currentTarget.files ?? [])]);
    event.currentTarget.value = '';
  };

  return (
    <section className="flex flex-col gap-3" aria-labelledby={`${fileId}-title`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={`${fileId}-title`} className="font-medium text-sm">
          {composeText.compose_images_title()}
        </h2>
        <input
          id={fileId}
          type="file"
          accept={ACCEPT}
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
          {composeText.compose_images_add()}
        </label>
      </div>
      <p className="text-muted-foreground text-xs">
        {composeText.compose_images_hint({ count: MAX_IMAGES, max: maxSize })}{' '}
        {composeText.compose_video_hint({ max: maxVideoSize })}
      </p>
      {problems.length === 0 ? null : (
        <ul role="alert" className="list-disc pl-5 text-destructive text-sm">
          {problems.map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
      )}
      {video === null ? null : <VideoRow video={video} disabled={pending} />}
      {images.length === 0 ? null : (
        <ol className="flex flex-col gap-2">
          {images.map((image, index) => (
            <ImageRow
              key={image.id}
              image={image}
              index={index}
              count={images.length}
              disabled={pending}
              onAlt={(altText) => update(image.id, { altText })}
              onAi={(aiGenerated) => update(image.id, { aiGenerated })}
              onMove={(offset) => move(index, offset)}
              onRemove={() => remove(image.id)}
            />
          ))}
        </ol>
      )}
    </section>
  );
}
