import { useLocale } from '../context.ts';
import { m } from '../i18n.ts';
import { kindLabel, stateLabel } from './format.ts';
import { KindIcon } from './kind-icon.tsx';
import type { LibraryAsset } from './queries.ts';

interface TileProps {
  readonly asset: LibraryAsset;
  onOpen(): void;
}

export function AiBadge() {
  return (
    <span className="rounded-full bg-secondary px-2 py-0.5 font-medium text-xs">
      {m.media_ai_badge()}
    </span>
  );
}

export function Preview({
  asset,
  iconClassName,
  alt = '',
}: {
  readonly asset: LibraryAsset;
  readonly iconClassName: string;
  readonly alt?: string;
}) {
  return asset.previewUrl === null ? (
    <KindIcon kind={asset.kind} className={iconClassName} />
  ) : (
    <img src={asset.previewUrl} alt={alt} className="size-full object-cover" />
  );
}

export function MediaTile({ asset, onOpen }: TileProps) {
  const { locale } = useLocale();
  const date = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(
    new Date(asset.createdAt),
  );
  const label =
    asset.kind === 'video' ? m.media_open_video({ date }) : m.media_open_image({ date });
  const state = stateLabel(asset);
  return (
    <li>
      <button
        type="button"
        aria-label={label}
        onClick={onOpen}
        className="flex w-full flex-col gap-2 rounded-xl border p-2 text-left text-muted-foreground hover:border-foreground/40 focus-visible:outline-2 focus-visible:outline-ring"
      >
        <span className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg bg-muted">
          <Preview asset={asset} iconClassName="size-10" />
          <span className="absolute top-2 left-2 flex flex-wrap gap-1">
            {asset.aiGenerated ? <AiBadge /> : null}
            {state === null ? null : (
              <span className="rounded-full bg-background px-2 py-0.5 text-xs">{state}</span>
            )}
          </span>
        </span>
        <span className="flex flex-col px-1 text-xs">
          <span className="font-medium text-foreground">{kindLabel(asset)}</span>
          <span>{date}</span>
        </span>
      </button>
    </li>
  );
}
