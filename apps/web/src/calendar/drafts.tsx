import { Link } from '@tanstack/react-router';
import type { PostSummary } from '../api.ts';
import { m as calendarText } from '../i18n/calendar.ts';
import { postText } from './entries.ts';
import type { Formats } from './formats.ts';

type Summary = PostSummary;

export function Drafts({
  items,
  formats,
}: {
  readonly items: readonly Summary[];
  readonly formats: Formats;
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
              <Link
                to="/posts/$postId"
                params={{ postId: post.id }}
                className="min-w-0 max-w-full truncate text-sm underline-offset-4 hover:underline"
              >
                {post.title ?? postText(post)}
              </Link>
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
