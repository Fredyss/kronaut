import { Link } from '@tanstack/react-router';
import {
  createContext,
  type KeyboardEvent,
  type ReactNode,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { ANALYTICS_ROLES, type PostSummary } from '../api.ts';
import { m as calendarText } from '../i18n/calendar.ts';
import { m } from '../i18n.ts';
import { canDelete, canDuplicate } from '../post-actions/permissions.ts';
import { editableBy } from '../post-actions/post-editable.ts';
import { MoreIcon } from './icons.tsx';

export type EntryDialog = 'preview' | 'delete';

export interface EntryActions {
  readonly role: string;
  show(dialog: EntryDialog, post: PostSummary): void;
  duplicate(post: PostSummary): void;
  edit(post: PostSummary): void;
}

export const EntryActionsContext = createContext<EntryActions | null>(null);

const ITEM =
  'flex w-full rounded-sm px-2 py-1.5 text-left text-sm outline-none hover:bg-accent focus-visible:bg-accent';

function moveFocus(event: KeyboardEvent<HTMLDivElement>): void {
  const items = [...event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]')];
  const at = items.indexOf(document.activeElement as HTMLElement);
  const last = items.length - 1;
  const next: Record<string, number> = {
    ArrowDown: at >= last ? 0 : at + 1,
    ArrowUp: at <= 0 ? last : at - 1,
    Home: 0,
    End: last,
  };
  const index = next[event.key];
  if (index === undefined) return;
  event.preventDefault();
  items[index]?.focus();
}

interface PopupProps {
  readonly id: string;
  readonly anchor: HTMLElement;
  readonly label: string;
  readonly children: ReactNode;
  onClose(refocus: boolean): void;
}

const GAP = 4;
const MARGIN = 8;

interface Place {
  readonly top: number;
  readonly maxHeight?: number;
}

// The menu never covers its button: a second click of a double-click would land on an item.
function placeMenu(button: DOMRect, height: number): Place {
  const below = window.innerHeight - button.bottom - GAP - MARGIN;
  const above = button.top - GAP - MARGIN;
  const up = height > below && above > below;
  const room = up ? above : below;
  const top = up ? button.top - GAP - Math.min(height, room) : button.bottom + GAP;
  return { top, maxHeight: room };
}

function Popup({ id, anchor, label, children, onClose }: PopupProps) {
  const menu = useRef<HTMLDivElement>(null);
  const closing = useRef(onClose);
  closing.current = onClose;
  const [rect] = useState(() => anchor.getBoundingClientRect());
  const [place, setPlace] = useState<Place>({ top: rect.bottom + GAP });
  useLayoutEffect(() => {
    setPlace(placeMenu(rect, menu.current?.offsetHeight ?? 0));
  }, [rect]);
  useEffect(() => {
    menu.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus({ preventScroll: true });
    const away = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!menu.current?.contains(target) && !anchor.contains(target)) closing.current(false);
    };
    const leave = () => closing.current(false);
    const scrolled = (event: Event) => {
      if (!menu.current?.contains(event.target as Node)) leave();
    };
    document.addEventListener('pointerdown', away);
    window.addEventListener('resize', leave);
    window.addEventListener('scroll', scrolled, true);
    return () => {
      document.removeEventListener('pointerdown', away);
      window.removeEventListener('resize', leave);
      window.removeEventListener('scroll', scrolled, true);
    };
  }, [anchor]);
  return createPortal(
    <div
      ref={menu}
      id={id}
      role="menu"
      aria-label={label}
      tabIndex={-1}
      style={{ ...place, right: Math.max(window.innerWidth - rect.right, MARGIN) }}
      className="fixed z-50 flex min-w-40 flex-col overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-lg"
      onKeyDown={(event) => {
        if (event.key === 'Escape' || event.key === 'Tab') {
          event.preventDefault();
          onClose(true);
          return;
        }
        moveFocus(event);
      }}
    >
      {children}
    </div>,
    document.body,
  );
}

function published(post: PostSummary): boolean {
  return post.destinations.some((destination) => destination.state === 'published');
}

export function EntryMenu({ post, text }: { readonly post: PostSummary; readonly text: string }) {
  const actions = useContext(EntryActionsContext);
  const button = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const menuId = useId();
  if (actions === null) return null;
  const close = (refocus: boolean) => {
    setOpen(false);
    if (refocus) button.current?.focus({ preventScroll: true });
  };
  const pick = (run: () => void) => () => {
    close(true);
    run();
  };
  const label = calendarText.calendar_entry_options({ text });
  return (
    <>
      <button
        ref={button}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((was) => !was)}
        className="absolute top-1/2 right-0 z-20 flex size-6 -translate-y-1/2 items-center justify-center rounded-sm bg-card text-muted-foreground opacity-0 hover:text-foreground focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-ring group-hover/chip:opacity-100 group-focus-within/chip:opacity-100 aria-expanded:opacity-100 [@media(hover:none)]:opacity-100"
      >
        <MoreIcon />
      </button>
      {open && button.current !== null ? (
        <Popup id={menuId} anchor={button.current} label={label} onClose={close}>
          <Link to="/posts/$postId" params={{ postId: post.id }} role="menuitem" className={ITEM}>
            {calendarText.calendar_entry_open()}
          </Link>
          {ANALYTICS_ROLES.has(actions.role) && published(post) ? (
            <Link
              to="/posts/$postId"
              params={{ postId: post.id }}
              hash="analytics"
              role="menuitem"
              className={ITEM}
            >
              {m.post_action_stats()}
            </Link>
          ) : null}
          {editableBy(actions.role, post) ? (
            <button
              type="button"
              role="menuitem"
              className={ITEM}
              onClick={pick(() => actions.edit(post))}
            >
              {m.post_action_edit()}
            </button>
          ) : null}
          {canDuplicate(actions.role) ? (
            <button
              type="button"
              role="menuitem"
              className={ITEM}
              onClick={pick(() => actions.duplicate(post))}
            >
              {m.post_action_duplicate()}
            </button>
          ) : null}
          <button
            type="button"
            role="menuitem"
            className={ITEM}
            onClick={pick(() => actions.show('preview', post))}
          >
            {calendarText.calendar_entry_preview()}
          </button>
          {canDelete(actions.role, post.destinations) ? (
            <button
              type="button"
              role="menuitem"
              className={`${ITEM} text-destructive`}
              onClick={pick(() => actions.show('delete', post))}
            >
              {m.post_action_delete()}
            </button>
          ) : null}
        </Popup>
      ) : null}
    </>
  );
}
