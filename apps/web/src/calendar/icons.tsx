import { Icon } from '../icon.tsx';

export function ChevronLeft() {
  return (
    <Icon>
      <path d="m15 18-6-6 6-6" />
    </Icon>
  );
}

export function ChevronRight() {
  return (
    <Icon>
      <path d="m9 18 6-6-6-6" />
    </Icon>
  );
}

export function ChevronsLeft() {
  return (
    <Icon>
      <path d="m11 17-5-5 5-5M18 17l-5-5 5-5" />
    </Icon>
  );
}

export function Plus() {
  return (
    <Icon>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  );
}

export function GridIcon() {
  return (
    <Icon>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
    </Icon>
  );
}

export function ListIcon() {
  return (
    <Icon>
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </Icon>
  );
}

export function MoreIcon() {
  return (
    <Icon className="size-3.5">
      <circle cx="5" cy="12" r="1" />
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
    </Icon>
  );
}
