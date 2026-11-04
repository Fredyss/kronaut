// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { m } from '../../base/locale/i18n.ts';
import { LinkList } from './post-links.tsx';
import type { DestinationLinks } from './queries.ts';

afterEach(cleanup);

const LINKS: DestinationLinks = {
  destinationId: 'dst_1',
  channelId: 'acct_1',
  shorten: true,
  links: [
    { longUrl: 'https://example.com/a', shortUrl: 'https://dub.sh/a', state: 'ready', error: null },
    { longUrl: 'https://example.com/b', shortUrl: null, state: 'pending', error: null },
    { longUrl: 'https://example.com/c', shortUrl: null, state: 'failed', error: 'timed_out' },
  ],
};

describe('LinkList', () => {
  it('shows each long link with its short link, the pending note or the reason', () => {
    render(<LinkList destination={LINKS} />);
    expect(screen.getByText('https://example.com/a')).toBeDefined();
    const short = screen.getByRole('link', { name: 'https://dub.sh/a' });
    expect(short.getAttribute('href')).toBe('https://dub.sh/a');
    expect(screen.getByText(m.post_short_link_pending())).toBeDefined();
    expect(screen.getByText(m.post_short_link_failed({ kind: 'timed_out' }))).toBeDefined();
  });

  it('shows nothing for a destination that is not shortened', () => {
    const { container } = render(<LinkList destination={{ ...LINKS, shorten: false }} />);
    expect(container.childElementCount).toBe(0);
    render(<LinkList destination={undefined} />);
    expect(screen.queryByText(m.post_short_links_title())).toBeNull();
  });
});
