import { toPlainText } from '@kronaut/compose/text';
import { type ComponentType, type ReactNode, useId } from 'react';
import type { Channel } from '../../api.ts';
import { m } from '../../i18n.ts';
import type { Doc } from '../doc.ts';
import { MediaGrid } from './media-grid.tsx';
import type { CardProps, PreviewImage } from './parts.tsx';
import { ProFeed } from './pro-feed.tsx';
import { ShortFeed } from './short-feed.tsx';

export interface PreviewTarget {
  readonly channel: Channel;
  readonly doc: Doc;
  readonly images: readonly PreviewImage[];
  readonly video: string | null;
  readonly poster?: string | null;
  readonly publishType: string;
}

export interface PreviewsProps {
  readonly targets: readonly PreviewTarget[];
  readonly empty?: ReactNode;
  readonly stacked?: boolean;
}

const CARDS: Partial<Record<Channel['preview'], ComponentType<CardProps>>> = {
  'short-feed': ShortFeed,
  'pro-feed': ProFeed,
  'media-grid': MediaGrid,
};

function aspectOf({ channel, publishType }: PreviewTarget) {
  return channel.postTypes.find((postType) => postType.id === publishType)?.imageAspect ?? null;
}

export default function Previews({ targets, empty = null, stacked = false }: PreviewsProps) {
  const titleId = useId();
  const cards = targets.flatMap((target) => {
    const Card = CARDS[target.channel.preview];
    if (Card === undefined) return [];
    return [
      <Card
        key={target.channel.id}
        channel={target.channel}
        text={toPlainText(target.doc)}
        images={target.images}
        video={target.video}
        poster={target.poster ?? null}
        aspect={aspectOf(target)}
      />,
    ];
  });
  if (cards.length === 0) return empty;
  return (
    <section className="flex flex-col gap-3" aria-labelledby={titleId}>
      <h2 id={titleId} className="font-medium text-sm">
        {m.compose_preview_title()}
      </h2>
      <div
        className={stacked ? 'grid grid-cols-[minmax(0,1fr)] gap-4' : 'grid gap-4 sm:grid-cols-2'}
      >
        {cards}
      </div>
    </section>
  );
}
