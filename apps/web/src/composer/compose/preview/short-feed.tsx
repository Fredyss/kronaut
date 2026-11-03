import { Card, type CardProps, More, type PreviewImage, Text, Thumb } from './parts.tsx';

const GRID_MAX = 4;

function Images({ images }: { readonly images: readonly PreviewImage[] }) {
  const [only] = images;
  if (only === undefined) return null;
  if (images.length === 1) {
    return <Thumb image={only} index={0} className="max-h-80 w-full rounded-md" />;
  }
  const shown = images.slice(0, GRID_MAX);
  return (
    <div className="grid grid-cols-2 gap-1">
      {shown.map((image, index) => (
        <div key={image.id} className="relative aspect-square overflow-hidden rounded-md">
          <Thumb image={image} index={index} className="size-full" />
          {index === shown.length - 1 ? <More count={images.length - shown.length} /> : null}
        </div>
      ))}
    </div>
  );
}

export function ShortFeed({ channel, text, images }: CardProps) {
  return (
    <Card channel={channel}>
      <Text text={text} />
      <Images images={images} />
    </Card>
  );
}
