import { getRouteApi } from '@tanstack/react-router';
import {
  type Dispatch,
  type DragEvent,
  type KeyboardEvent,
  type RefObject,
  type SetStateAction,
  useRef,
  useState,
} from 'react';
import type { PostSummary } from '../api.ts';
import type { CalendarView } from '../calendar-search.ts';
import type { Entry } from './entries.ts';
import {
  canLand,
  dayDelta,
  instantOf,
  isMovable,
  type MovablePost,
  movedLocal,
  slotLocal,
  useMove,
} from './move.ts';
import { dayOf, type VisibleRange } from './time.ts';

const route = getRouteApi('/app/');

const DRAG_TYPE = 'application/x-kronaut-post';
const STEP: Readonly<Record<string, number>> = {
  ArrowLeft: -1,
  ArrowRight: 1,
  ArrowUp: -7,
  ArrowDown: 7,
};

type Summary = PostSummary;

interface DropTarget {
  onDragEnter(event: DragEvent<HTMLElement>): void;
  onDragOver(event: DragEvent<HTMLElement>): void;
  onDragLeave(event: DragEvent<HTMLElement>): void;
  onDrop(event: DragEvent<HTMLElement>): void;
}

export interface Mover {
  readonly over: string | null;
  canMove(post: Summary): post is MovablePost;
  restoreFocus(): void;
  keyDown(event: KeyboardEvent<HTMLElement>, entry: Entry): void;
  dragStart(event: DragEvent<HTMLElement>, entry: Entry): void;
  dragEnd(): void;
  target(key: string): DropTarget;
}

interface MoverProps {
  readonly workspaceId: string;
  readonly view: CalendarView;
  readonly range: VisibleRange;
  readonly timeZone: string;
}

interface Source {
  readonly post: MovablePost;
  readonly day: string;
  readonly at: string;
}

interface DropDeps {
  readonly source: RefObject<Source | null>;
  readonly setOver: Dispatch<SetStateAction<string | null>>;
  readonly move: (post: MovablePost, local: string, focusId: string | null) => void;
  readonly clear: () => void;
  readonly timeZone: string;
}

const DAY_KEY_LENGTH = 10;

function landing(from: Source, key: string, timeZone: string): string | null {
  if (key.length > DAY_KEY_LENGTH) return slotLocal(from.post, from.at, key, timeZone);
  const days = dayDelta(from.day, key);
  return canLand(from.post, days) ? movedLocal(from.post, days) : null;
}

function dropTarget({ source, setOver, move, clear, timeZone }: DropDeps, key: string): DropTarget {
  const accept = (event: DragEvent<HTMLElement>) => {
    const from = source.current;
    if (from === null || landing(from, key, timeZone) === null) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setOver(key);
  };
  return {
    onDragEnter: accept,
    onDragOver: accept,
    onDragLeave(event) {
      if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
      setOver((current) => (current === key ? null : current));
    },
    onDrop(event) {
      const from = source.current;
      if (from === null) return;
      event.preventDefault();
      const local = landing(from, key, timeZone);
      if (local !== null) move(from.post, local, null);
      clear();
    },
  };
}

export function useMover({ workspaceId, view, range, timeZone }: MoverProps) {
  const navigate = route.useNavigate();
  const moves = useMove(workspaceId);
  const source = useRef<Source | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const focus = useRef<string | null>(null);

  const canMove = (post: Summary): post is MovablePost =>
    isMovable(post) && !moves.pending.has(post.id);

  const move = (post: MovablePost, local: string, focusId: string | null) => {
    const target = { scheduleLocal: local, scheduleTz: post.scheduleTz };
    const back = { scheduleLocal: post.scheduleLocal, scheduleTz: post.scheduleTz };
    const day = dayOf(instantOf(target), timeZone);
    focus.current = focusId;
    void moves.send(post, target, {
      back,
      onSettled: (moved) => {
        if (focusId === null) return;
        focus.current = focusId;
        if (moved !== null && !range.days.some((d) => d.toString() === day)) {
          void navigate({ to: '/', search: { view, date: day } });
        }
      },
    });
  };

  const clear = () => {
    source.current = null;
    setOver(null);
  };

  const mover: Mover = {
    over,
    canMove,
    restoreFocus() {
      const id = focus.current;
      if (id === null) return;
      const chip = document.querySelector<HTMLElement>(`[data-chip="${id}"]`);
      if (chip === null) return;
      focus.current = null;
      if (document.activeElement !== chip) chip.focus();
    },
    keyDown(event, entry) {
      const days = STEP[event.key];
      if (days === undefined || !event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) {
        return;
      }
      const { post } = entry;
      if (!canMove(post)) return;
      event.preventDefault();
      if (canLand(post, days)) move(post, movedLocal(post, days), entry.destination.id);
    },
    dragStart(event, entry) {
      if (!canMove(entry.post)) return;
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData(DRAG_TYPE, entry.post.id);
      source.current = { post: entry.post, day: entry.day, at: entry.at };
    },
    dragEnd: clear,
    target: (key) => dropTarget({ source, setOver, move, clear, timeZone }, key),
  };
  return { mover, moves };
}
