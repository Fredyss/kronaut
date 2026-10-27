import { m } from './i18n.ts';

const BADGE_MAX = 99;

export function CountBadge({ count }: { readonly count: number | undefined }) {
  if (count === undefined || count <= 0) return null;
  return (
    <span
      aria-hidden="true"
      className="min-w-5 rounded-full bg-destructive px-1.5 text-center font-medium text-white text-xs tabular-nums"
    >
      {count > BADGE_MAX ? m.inbox_badge_overflow({ count: BADGE_MAX }) : count}
    </span>
  );
}
