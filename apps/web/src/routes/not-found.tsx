import { Button } from '@kronaut/ui';
import { Link } from '@tanstack/react-router';
import { m } from '../i18n.ts';

export function NotFoundPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="font-semibold text-xl">{m.not_found_title()}</h1>
      <Button asChild variant="outline">
        <Link to="/">{m.not_found_back()}</Link>
      </Button>
    </main>
  );
}
