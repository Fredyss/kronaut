import { Icon } from '../icon.tsx';
import { KindIcon } from '../media/kind-icon.tsx';

const SIZE = 'size-5';

export function CalendarIcon() {
  return (
    <Icon className={SIZE}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </Icon>
  );
}

export function InboxIcon() {
  return (
    <Icon className={SIZE}>
      <path d="M3 13h5l1.5 3h5l1.5-3h5" />
      <path d="M6 4h12l3 9v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-6Z" />
    </Icon>
  );
}

export function ChannelsIcon() {
  return (
    <Icon className={SIZE}>
      <circle cx="12" cy="12" r="2" />
      <path d="M8 8a5.5 5.5 0 0 0 0 8M16 8a5.5 5.5 0 0 1 0 8M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14" />
    </Icon>
  );
}

export function SettingsIcon() {
  return (
    <Icon className={SIZE}>
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
      <circle cx="15" cy="7" r="2" />
      <circle cx="9" cy="17" r="2" />
    </Icon>
  );
}

export function MediaIcon() {
  return <KindIcon kind="image" className={SIZE} />;
}
