import { cn } from '@kronaut/ui';
import { type SyntheticEvent, useState } from 'react';
import type { PickedImage } from '../contents.ts';
import { type AspectRange, clampAspect, type Ratio } from './aspect.ts';
import { Card, type CardProps, Thumb } from './parts.tsx';

const SQUARE: Ratio = { width: 1, height: 1 };

function Cover({
  image,
  aspect,
}: {
  readonly image: PickedImage;
  readonly aspect: AspectRange | null;
}) {
  const [natural, setNatural] = useState<Ratio>(SQUARE);
  const onLoad = ({ currentTarget }: SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth: width, naturalHeight: height } = currentTarget;
    if (width > 0 && height > 0) setNatural({ width, height });
  };
  const { width, height } = clampAspect(natural, aspect);
  return (
    <div className="overflow-hidden rounded-md" style={{ aspectRatio: `${width} / ${height}` }}>
      <Thumb image={image} index={0} className="size-full" onLoad={onLoad} />
    </div>
  );
}

function Dots({ images }: { readonly images: readonly PickedImage[] }) {
  if (images.length < 2) return null;
  return (
    <div aria-hidden="true" className="flex justify-center gap-1">
      {images.map((image, index) => (
        <span
          key={image.id}
          className={cn(
            'size-1.5 rounded-full',
            index === 0 ? 'bg-foreground' : 'bg-muted-foreground/40',
          )}
        />
      ))}
    </div>
  );
}

export function MediaGrid({ channel, text, images, aspect }: CardProps) {
  const [first] = images;
  return (
    <Card channel={channel}>
      {first === undefined ? null : <Cover key={first.id} image={first} aspect={aspect} />}
      <Dots images={images} />
      <p className="line-clamp-2 whitespace-pre-wrap break-words text-sm">
        <span className="font-semibold">{channel.displayName}</span>
        {text === '' ? null : <> {text}</>}
      </p>
    </Card>
  );
}
