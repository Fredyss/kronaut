import { cn } from '@kronaut/ui';
import { type PostTag, TAG_DOT, type TagColor } from './tags.ts';

const MAX_DOTS = 3;

export function TagDot({ color }: { readonly color: TagColor }) {
  return <span aria-hidden="true" className={cn('size-2 shrink-0 rounded-full', TAG_DOT[color])} />;
}

export function TagDots({ tags }: { readonly tags: readonly PostTag[] }) {
  if (tags.length === 0) return null;
  return (
    <span className="flex shrink-0 items-center gap-0.5" title={tags.map((t) => t.name).join(', ')}>
      {tags.slice(0, MAX_DOTS).map((tag) => (
        <TagDot key={tag.id} color={tag.color} />
      ))}
    </span>
  );
}
