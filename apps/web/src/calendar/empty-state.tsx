import { buttonVariants } from '@kronaut/ui';
import { Link } from '@tanstack/react-router';
import { preloadEditor } from '../compose/load.ts';
import { m } from '../i18n.ts';

export function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-12 text-center">
      <h2 className="font-medium text-lg">{m.home_empty_title()}</h2>
      <p className="text-muted-foreground text-sm">{m.home_empty_body()}</p>
      <p className="text-muted-foreground text-xs">{m.posts_scheduled({ count: 0 })}</p>
      <Link
        to="/compose"
        className={buttonVariants({ className: 'mt-2' })}
        onMouseEnter={preloadEditor}
        onFocus={preloadEditor}
      >
        {m.nav_new_post()}
      </Link>
    </div>
  );
}
