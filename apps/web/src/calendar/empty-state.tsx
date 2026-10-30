import { buttonVariants } from '@kronaut/ui';
import { Link } from '@tanstack/react-router';
import { preloadEditor } from '../compose/load.ts';
import { m as calendarText } from '../i18n/calendar.ts';

export function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-12 text-center">
      <h2 className="font-medium text-lg">{calendarText.home_empty_title()}</h2>
      <p className="text-muted-foreground text-sm">{calendarText.home_empty_body()}</p>
      <p className="text-muted-foreground text-xs">{calendarText.posts_scheduled({ count: 0 })}</p>
      <Link
        to="/"
        search={(prev) => ({ ...prev, compose: 'new' })}
        state={{ composeHere: true }}
        resetScroll={false}
        className={buttonVariants({ className: 'mt-2' })}
        onMouseEnter={preloadEditor}
        onFocus={preloadEditor}
      >
        {calendarText.nav_new_post()}
      </Link>
    </div>
  );
}
