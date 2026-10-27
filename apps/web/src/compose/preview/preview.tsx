import { toPlainText } from '@kronaut/compose/text';
import { type ComponentType, useId } from 'react';
import type { Channel } from '../../api.ts';
import { m } from '../../i18n.ts';
import type { PickedImage } from '../contents.ts';
import type { Doc } from '../doc.ts';
import { MediaGrid } from './media-grid.tsx';
import type { CardProps } from './parts.tsx';
import { ProFeed } from './pro-feed.tsx';
import { ShortFeed } from './short-feed.tsx';

export interface PreviewTarget {
  readonly channel: Channel;
  readonly doc: Doc;
  readonly images: readonly PickedImage[];
  readonly publishType: string;
}

export interface PreviewsProps {
  readonly targets: readonly PreviewTarget[];
}

const CARDS: Partial<Record<Channel['preview'], ComponentType<CardProps>>> = {
  'short-feed': ShortFeed,
  'pro-feed': ProFeed,
  'media-grid': MediaGrid,
};

function aspectOf({ channel, publishType }: PreviewTarget) {
  return channel.postTypes.find((postType) => postType.id === publishType)?.imageAspect ?? null;
}

export default function Previews({ targets }: PreviewsProps) {
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
        aspect={aspectOf(target)}
      />,
    ];
  });
  if (cards.length === 0) return null;
  return (
    <section className="flex flex-col gap-3" aria-labelledby={titleId}>
      <h2 id={titleId} className="font-medium text-sm">
        {m.compose_preview_title()}
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">{cards}</div>
    </section>
  );
}
