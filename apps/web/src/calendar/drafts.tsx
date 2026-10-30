import { Link } from '@tanstack/react-router';
import type { PostSummary } from '../api.ts';
import { m as calendarText } from '../i18n/calendar.ts';
import { editableBy } from '../post-actions/post-editable.ts';
import { postText } from './entries.ts';
import { markComposeOpened } from './entry-actions.tsx';
import type { Formats } from './formats.ts';

type Summary = PostSummary;

const LINK = 'min-w-0 max-w-full truncate text-sm underline-offset-4 hover:underline';

function DraftLink({ post, role }: { readonly post: Summary; readonly role: string }) {
  const text = post.title ?? postText(post);
  if (!editableBy(role, post)) {
    return (
      <Link to="/posts/$postId" params={{ postId: post.id }} className={LINK}>
        {text}
      </Link>
    );
  }
  return (
    <Link
      to="/"
      search={(prev) => ({ ...prev, compose: post.id })}
      onClick={markComposeOpened}
      className={LINK}
    >
      {text}
    </Link>
  );
}

export function Drafts({
  items,
  formats,
  role,
}: {
  readonly items: readonly Summary[];
  readonly formats: Formats;
  readonly role: string;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="font-medium text-lg">{calendarText.calendar_drafts()}</h2>
      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">{calendarText.calendar_drafts_empty()}</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {items.map((post) => (
            <li key={post.id} className="flex flex-wrap items-baseline gap-x-3">
              <DraftLink post={post} role={role} />
              <span className="text-muted-foreground text-xs">
                {calendarText.calendar_draft_updated({
                  when: formats.stamp.format(new Date(post.updatedAt)),
                })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
