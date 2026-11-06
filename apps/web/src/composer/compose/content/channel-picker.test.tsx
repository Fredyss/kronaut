// @vitest-environment happy-dom
import { createApiClient } from '@kronaut/sdk';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { ApiClientContext } from '../../../base/api/client.ts';
import { LocaleContext } from '../../../base/locale/context.ts';
import type { Channel } from '../../../records/channels/queries.ts';
import { channel } from '../testing.tsx';
import { ChannelsFieldset } from './channel-picker.tsx';
import { NO_MEDIA } from './choice.ts';
import type { Sources } from './group-picks.ts';

afterEach(cleanup);

const brand = (id: string, name: string) => ({
  id,
  name,
  slug: name.toLowerCase(),
  archivedAt: null,
  channelCount: 1,
});

const CHANNELS = [
  { ...channel('acct_1', 'bluesky', 'Acme on Bluesky'), brandId: 'brand_a' },
  { ...channel('acct_2', 'mastodon', 'Acme on Mastodon'), brandId: 'brand_a' },
  { ...channel('acct_3', 'bluesky', 'Zeta on Bluesky'), brandId: 'brand_z' },
  { ...channel('acct_4', 'bluesky', 'Studio'), brandId: null },
] as unknown as readonly Channel[];

function mount() {
  const fetch = async (raw: Request | URL | string) =>
    (raw as Request).url.endsWith('/groups')
      ? Response.json({ items: [] })
      : Response.json({ items: [brand('brand_a', 'Acme'), brand('brand_z', 'Zeta')] });
  const client = createApiClient({ baseUrl: 'http://kronaut.test', fetch });
  function Host() {
    const [selected, setSelected] = useState<ReadonlySet<string>>(new Set(['acct_3']));
    const [sources, setSources] = useState<Sources>(new Map());
    return (
      <ChannelsFieldset
        workspaceId="ws_1"
        channels={CHANNELS}
        failed={false}
        mediaFor={() => NO_MEDIA}
        customized={() => false}
        stored={new Set()}
        selected={selected}
        setSelected={setSelected}
        sources={sources}
        setSources={setSources}
        pending={false}
      />
    );
  }
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ApiClientContext.Provider value={client}>
        <LocaleContext.Provider value={{ locale: 'en', choose: () => undefined }}>
          <Host />
        </LocaleContext.Provider>
      </ApiClientContext.Provider>
    </QueryClientProvider>,
  );
}

const checked = (name: string) =>
  (screen.getByLabelText(name, { exact: false }) as HTMLInputElement).checked;

describe('the channel picker', () => {
  it('groups channels by brand and selects or clears all of one brand', async () => {
    mount();
    const headings = await screen.findAllByRole('heading');
    expect(headings.map((heading) => heading.textContent)).toEqual(['Acme', 'Zeta', 'No brand']);

    fireEvent.click(screen.getByRole('button', { name: 'Select all channels of Acme' }));
    expect(checked('Acme on Bluesky')).toBe(true);
    expect(checked('Acme on Mastodon')).toBe(true);
    expect(checked('Zeta on Bluesky')).toBe(true);
    expect(checked('Studio')).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'Clear the channels of Acme' }));
    expect(checked('Acme on Bluesky')).toBe(false);
    expect(checked('Zeta on Bluesky')).toBe(true);
  });
});
