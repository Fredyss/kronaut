import { Card, type CardProps, More, type PreviewImage, Text, Thumb } from './parts.tsx';

const ROW_MAX = 3;

function Images({ images }: { readonly images: readonly PreviewImage[] }) {
  const [first, ...rest] = images;
  if (first === undefined) return null;
  const row = rest.slice(0, ROW_MAX);
  return (
    <div className="flex flex-col gap-1">
      <Thumb image={first} index={0} className="w-full rounded-md" />
      {row.length === 0 ? null : (
        <div className="grid grid-cols-3 gap-1">
          {row.map((image, index) => (
            <div key={image.id} className="relative aspect-square overflow-hidden rounded-md">
              <Thumb image={image} index={index + 1} className="size-full" />
              {index === row.length - 1 ? <More count={rest.length - row.length} /> : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ProFeed({ channel, text, images }: CardProps) {
  return (
    <Card channel={channel}>
      <Text text={text} clamp="line-clamp-3" />
      <Images images={images} />
    </Card>
  );
}
