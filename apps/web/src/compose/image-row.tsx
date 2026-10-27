import { Button, Label } from '@kronaut/ui';
import { useId } from 'react';
import { m } from '../i18n.ts';
import type { PickedImage } from './contents.ts';
import { MAX_ALT_TEXT } from './media.ts';

export function ImageRow({
  image,
  index,
  count,
  disabled,
  onAlt,
  onMove,
  onRemove,
}: {
  readonly image: PickedImage;
  readonly index: number;
  readonly count: number;
  readonly disabled: boolean;
  readonly onAlt: (value: string) => void;
  readonly onMove: (offset: -1 | 1) => void;
  readonly onRemove: () => void;
}) {
  const altId = useId();
  const position = index + 1;
  return (
    <li className="flex flex-wrap items-start gap-3 rounded-lg border p-3">
      {image.thumb === null ? (
        <div className="flex size-24 items-center justify-center rounded-md bg-muted text-muted-foreground text-xs">
          {m.compose_image_position({ position })}
        </div>
      ) : (
        <img
          src={image.thumb}
          alt={m.compose_image_preview({ position })}
          className="size-24 rounded-md object-cover"
        />
      )}
      <div className="flex min-w-48 flex-1 flex-col gap-2">
        <Label htmlFor={altId}>{m.compose_alt_text_label({ position })}</Label>
        <textarea
          id={altId}
          value={image.altText}
          maxLength={MAX_ALT_TEXT}
          disabled={disabled}
          rows={2}
          onChange={(event) => onAlt(event.currentTarget.value)}
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-2 focus-visible:outline-ring"
        />
        <p className="text-muted-foreground text-xs">
          {m.compose_alt_text_hint({ count: MAX_ALT_TEXT })}
        </p>
      </div>
      <div className="flex flex-col gap-1">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled || index === 0}
          aria-label={m.compose_image_move_up({ position })}
          onClick={() => onMove(-1)}
        >
          ↑
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled || index === count - 1}
          aria-label={m.compose_image_move_down({ position })}
          onClick={() => onMove(1)}
        >
          ↓
        </Button>
        <Button type="button" size="sm" variant="ghost" disabled={disabled} onClick={onRemove}>
          {m.compose_image_remove()}
        </Button>
      </div>
    </li>
  );
}
