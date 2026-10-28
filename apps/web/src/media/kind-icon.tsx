import { Icon } from '../icon.tsx';
import type { LibraryKind } from './queries.ts';

export function KindIcon({
  kind,
  className,
}: {
  readonly kind: LibraryKind;
  readonly className: string;
}) {
  return kind === 'video' ? (
    <Icon className={className}>
      <rect x="3" y="6" width="13" height="12" rx="2" />
      <path d="m16 10 5-3v10l-5-3" />
    </Icon>
  ) : (
    <Icon className={className}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="10" r="2" />
      <path d="m21 16-5-5-9 9" />
    </Icon>
  );
}
