import { cn } from '@kronaut/ui';
import type { ReactNode, SyntheticEvent } from 'react';
import type { Channel } from '../../api.ts';
import { useLocale } from '../../context.ts';
import { m } from '../../i18n.ts';
import { providerUi } from '../../providers.ts';
import type { PickedImage } from '../contents.ts';
import type { AspectRange } from './aspect.ts';

export type PreviewImage = Pick<PickedImage, 'id' | 'thumb' | 'altText'>;

export interface CardProps {
  readonly channel: Channel;
  readonly text: string;
  readonly images: readonly PreviewImage[];
  readonly video: string | null;
  readonly aspect: AspectRange | null;
}

function firstGrapheme(text: string, locale: string): string {
  const [first] = new Intl.Segmenter(locale, { granularity: 'grapheme' }).segment(text.trim());
  return first?.segment ?? '';
}

function Header({ channel }: { readonly channel: Channel }) {
  const { locale } = useLocale();
  const provider = providerUi(channel.provider);
  return (
    <header className="flex items-center gap-2">
      <span
        aria-hidden="true"
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-full font-medium text-background text-sm',
          provider.badge,
        )}
      >
        {firstGrapheme(channel.displayName, locale)}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="flex min-w-0 items-baseline gap-1 text-sm">
          <span className="truncate font-semibold">{channel.displayName}</span>
          {channel.handle === null ? null : (
            <span className="truncate text-muted-foreground">{channel.handle}</span>
          )}
        </span>
        <span className="text-muted-foreground text-xs">{provider.name()}</span>
      </span>
    </header>
  );
}

export function Card({
  channel,
  children,
}: {
  readonly channel: Channel;
  readonly children: ReactNode;
}) {
  return (
    <article
      aria-label={channel.displayName}
      className="flex w-full max-w-sm flex-col gap-3 rounded-lg border bg-card p-3 text-card-foreground"
    >
      <Header channel={channel} />
      {children}
    </article>
  );
}

export function Thumb({
  image,
  index,
  className,
  onLoad,
}: {
  readonly image: PreviewImage;
  readonly index: number;
  readonly className: string;
  readonly onLoad?: (event: SyntheticEvent<HTMLImageElement>) => void;
}) {
  if (image.thumb === null) return <div className={cn('aspect-square bg-muted', className)} />;
  const alt = image.altText.trim();
  return (
    <img
      src={image.thumb}
      alt={alt === '' ? m.compose_image_preview({ position: index + 1 }) : alt}
      className={cn('object-cover', className)}
      onLoad={onLoad}
    />
  );
}

export function More({ count }: { readonly count: number }) {
  const { locale } = useLocale();
  if (count <= 0) return null;
  return (
    <span className="absolute inset-0 flex items-center justify-center bg-black/50 font-semibold text-white text-xl">
      +{new Intl.NumberFormat(locale).format(count)}
    </span>
  );
}

export function Text({ text, clamp }: { readonly text: string; readonly clamp?: string }) {
  if (text === '') return null;
  return <p className={cn('whitespace-pre-wrap break-words text-sm', clamp)}>{text}</p>;
}
