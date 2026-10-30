// @vitest-environment happy-dom
import { createApiClient } from '@kronaut/sdk';
import { toast } from '@kronaut/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiClientContext } from '../context.ts';
import { TagPicker } from './picker.tsx';
import type { PostTag } from './tags.ts';

vi.mock('@kronaut/ui', async (original) => ({
  ...(await original<typeof import('@kronaut/ui')>()),
  toast: vi.fn(),
}));

afterEach(cleanup);

const tag = (id: string, name: string) => ({ id, name, color: 'teal', postCount: 0 }) as const;
const LAUNCH = tag('tag_1', 'Launch');
const PROMO = tag('tag_2', 'Promo');
const OTHER = tag('tag_3', 'Other');

function mount(start: readonly PostTag[], created: Promise<Response> = new Promise(() => {})) {
  const changes = vi.fn();
  const fetch = async (raw: Request | URL | string) =>
    (raw as Request).method === 'POST'
      ? await created
      : Response.json({ items: [LAUNCH, PROMO, OTHER] });
  const client = createApiClient({ baseUrl: 'http://kronaut.test', fetch });
  function Host() {
    const [value, setValue] = useState(start);
    return (
      <TagPicker
        workspaceId="ws_1"
        value={value}
        onChange={(next) => {
          changes(next.map((item) => item.id));
          setValue(next);
        }}
        editable
      />
    );
  }
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ApiClientContext.Provider value={client}>
        <Host />
      </ApiClientContext.Provider>
    </QueryClientProvider>,
  );
  return { changes, input: screen.getByRole('combobox', { name: 'Add a tag' }) };
}

describe('the tag picker keyboard', () => {
  it('picks with Enter only while the list is shown', async () => {
    const { changes, input } = mount([]);
    fireEvent.focus(input);
    await screen.findByRole('option', { name: 'Launch' });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).toBeNull();
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(changes).not.toHaveBeenCalled();

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(changes).toHaveBeenCalledWith([PROMO.id]);
  });

  it('keeps Escape while the list is shown and lets it through otherwise', async () => {
    const { input } = mount([]);
    fireEvent.focus(input);
    await screen.findByRole('option', { name: 'Launch' });
    expect(fireEvent.keyDown(input, { key: 'Escape' })).toBe(false);
    expect(fireEvent.keyDown(input, { key: 'Escape' })).toBe(true);
  });

  it('removes one tag with Backspace, not while it repeats, and nothing from an empty post', () => {
    const { changes, input } = mount([LAUNCH, PROMO]);
    fireEvent.keyDown(input, { key: 'Backspace', repeat: true });
    expect(changes).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: 'Backspace' });
    fireEvent.keyDown(input, { key: 'Backspace' });
    fireEvent.keyDown(input, { key: 'Backspace' });
    expect(changes.mock.calls).toEqual([[[LAUNCH.id]], [[]]]);
  });

  it('keeps the input, and so the focus, when the last free place is taken', async () => {
    const full = Array.from({ length: 19 }, (_, index) => tag(`tag_x${index}`, `Tag ${index}`));
    const { input } = mount(full);
    input.focus();
    fireEvent.focus(input);
    fireEvent.click(await screen.findByRole('option', { name: 'Launch' }));
    expect(screen.getByRole('combobox', { name: 'Add a tag' })).toBe(input);
    expect(document.activeElement).toBe(input);
    expect(screen.queryByRole('listbox')).toBeNull();
  });
});

describe('creating a tag', () => {
  it('explains a refusal to a member restricted to part of the workspace', async () => {
    const details = [{ path: 'authorization', code: 'out_of_scope' }];
    const error = { code: 'forbidden', message: '', details };
    const { changes, input } = mount(
      [],
      Promise.resolve(Response.json({ error }, { status: 403 })),
    );
    fireEvent.focus(input);
    await screen.findByRole('option', { name: 'Launch' });
    fireEvent.change(input, { target: { value: 'Fresh' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await vi.waitFor(() => expect(toast).toHaveBeenCalled());
    expect(toast).toHaveBeenCalledWith(
      "You have access to only part of this workspace, so you can't create tags.",
      'destructive',
    );
    expect(changes).not.toHaveBeenCalled();
  });

  it('adds it to what is chosen when the server answers, not when it was asked', async () => {
    let answer: (response: Response) => void = () => undefined;
    const created = new Promise<Response>((resolve) => {
      answer = resolve;
    });
    const { changes, input } = mount([], created);
    fireEvent.focus(input);
    await screen.findByRole('option', { name: 'Launch' });
    fireEvent.change(input, { target: { value: 'Fresh' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.click(await screen.findByRole('option', { name: 'Promo' }));

    await act(async () => answer(Response.json(tag('tag_9', 'Fresh'), { status: 201 })));
    expect(changes.mock.calls.at(-1)).toEqual([[PROMO.id, 'tag_9']]);
  });
});
