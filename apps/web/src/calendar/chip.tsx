import { cn } from '@kronaut/ui';
import { Link } from '@tanstack/react-router';
import { stateLabel } from '../destinations.ts';
import { m as calendarText } from '../i18n/calendar.ts';
import { m } from '../i18n.ts';
import { providerUi } from '../providers.ts';
import { TagDots } from '../tags/picker.tsx';
import { type Entry, postText } from './entries.ts';
import { EntryMenu } from './entry-menu.tsx';
import type { Formats } from './formats.ts';
import type { Mover } from './use-mover.ts';

export const MOVE_HINT_ID = 'calendar-move-hint';

interface ChipProps {
  readonly entry: Entry;
  readonly formats: Formats;
  readonly mover: Mover;
  readonly draggable: boolean;
  readonly compact?: boolean | undefined;
}

function chipLabel(label: string, post: Entry['post'], locale: string): string {
  if (post.tags.length === 0) return label;
  const names = post.tags.map((tag) => tag.name);
  const tags = new Intl.ListFormat(locale).format(names);
  return calendarText.calendar_chip_tags({ label, tags });
}

function Chip({ entry, formats, mover, draggable, compact = false }: ChipProps) {
  const { post, destination, at } = entry;
  const when = new Date(at);
  const time = formats.time.format(when);
  const provider = providerUi(destination.provider);
  const channel = provider.name();
  const state = stateLabel(destination.state);
  const text = postText(post);
  const ownZone = post.scheduleTz;
  const own =
    ownZone === null || ownZone === formats.timeZone
      ? undefined
      : calendarText.calendar_own_time({
          when: formats.stampIn(ownZone).format(when),
          tz: ownZone,
        });
  const movable = mover.canMove(post);
  const label = calendarText.calendar_chip_label({ time, channel, state, text });
  return (
    <div className="group/chip relative z-10 min-w-0">
      <Link
        to="/posts/$postId"
        params={{ postId: post.id }}
        aria-label={chipLabel(label, post, formats.locale)}
        aria-describedby={movable ? MOVE_HINT_ID : undefined}
        title={own}
        data-chip={destination.id}
        draggable={movable && draggable ? true : undefined}
        onKeyDown={(event) => mover.keyDown(event, entry)}
        onDragStart={(event) => {
          if (movable && draggable) mover.dragStart(event, entry);
        }}
        onDragEnd={mover.dragEnd}
        className={cn(
          'flex min-w-0 rounded-md border bg-card pr-7 text-xs hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring',
          compact ? 'items-center gap-1.5 py-0.5 pl-1.5' : 'flex-col gap-0.5 py-1 pl-2',
        )}
      >
        {compact ? (
          <>
            <span
              aria-hidden="true"
              className={cn('size-1.5 shrink-0 rounded-full', provider.badge)}
            />
            <span className="truncate">{text}</span>
            <TagDots tags={post.tags} />
          </>
        ) : (
          <ChipBody
            at={at}
            time={time}
            channel={channel}
            state={state}
            text={text}
            images={post.mediaCount}
            tags={post.tags}
          />
        )}
      </Link>
      <EntryMenu post={post} text={text} />
    </div>
  );
}

interface ChipBodyProps {
  readonly at: string;
  readonly time: string;
  readonly channel: string;
  readonly state: string;
  readonly text: string;
  readonly images: number;
  readonly tags: Entry['post']['tags'];
}

function ChipBody({ at, time, channel, state, text, images, tags }: ChipBodyProps) {
  return (
    <>
      <span className="flex min-w-0 items-baseline gap-1.5">
        <time dateTime={at} className="font-medium tabular-nums">
          {time}
        </time>
        <span className="truncate text-muted-foreground">{channel}</span>
      </span>
      <span className="truncate">{text}</span>
      <span className="flex flex-wrap items-center gap-x-2 text-muted-foreground">
        <span>{state}</span>
        {images === 0 ? null : <span>{m.post_images({ count: images })}</span>}
        <TagDots tags={tags} />
      </span>
    </>
  );
}

interface ChipListProps {
  readonly entries: readonly Entry[];
  readonly formats: Formats;
  readonly mover: Mover;
  readonly draggable: boolean;
  readonly compact?: boolean | undefined;
}

export function ChipList({ entries, ...chip }: ChipListProps) {
  return (
    <ul className="flex min-w-0 flex-col gap-1">
      {entries.map((entry) => (
        <li key={entry.destination.id}>
          <Chip entry={entry} {...chip} />
        </li>
      ))}
    </ul>
  );
}
