import type { BaseContext, SettingOptions } from '@kronaut/core';
import * as z from 'zod';
import { readJson, send } from '../_kit/http.ts';
import { isSuccess, pinterestFailure } from './errors.ts';
import { API_BASE } from './oauth.ts';

const MAX_BOARDS = 500;
const PAGE_SIZE = 250;
const MAX_PAGES = 10;

export const pinterestId = z.string().regex(/^\d{1,32}$/);

const board = z.object({ id: pinterestId, name: z.string().min(1) });
export type Board = z.infer<typeof board>;

const boardPage = z.looseObject({
  items: z.array(z.looseObject({ id: pinterestId, name: z.string() })),
  bookmark: z.string().nullish(),
});

const boardCapabilities = z.object({ boards: z.array(board).max(MAX_BOARDS) });

async function getJson<T>(ctx: BaseContext, token: string, url: URL, schema: z.ZodType<T>) {
  const response = await send(ctx, 'none', url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!isSuccess(response.status))
    throw await pinterestFailure(response, { effect: 'none', now: ctx.now() });
  return readJson(response, schema, 'none');
}

function byName(a: Board, b: Board): number {
  return a.name.localeCompare(b.name, 'en') || a.id.localeCompare(b.id);
}

export async function listPublicBoards(ctx: BaseContext, token: string): Promise<Board[]> {
  const boards: Board[] = [];
  let bookmark: string | undefined;
  for (let page = 0; page < MAX_PAGES && boards.length < MAX_BOARDS; page += 1) {
    const url = new URL(`${API_BASE}/boards`);
    url.searchParams.set('privacy', 'PUBLIC');
    url.searchParams.set('page_size', String(PAGE_SIZE));
    if (bookmark !== undefined) url.searchParams.set('bookmark', bookmark);
    const result = await getJson(ctx, token, url, boardPage);
    for (const item of result.items) {
      const name = item.name.normalize('NFC').trim();
      boards.push({ id: item.id, name: name === '' ? item.id : name });
    }
    const next = result.bookmark ?? '';
    if (next === '') break;
    bookmark = next;
  }
  return boards.slice(0, MAX_BOARDS).sort(byName);
}

const userAccount = z.looseObject({
  id: pinterestId,
  username: z.string().regex(/^[A-Za-z0-9_.-]{1,100}$/),
  business_name: z.string().nullish(),
});
export type UserAccount = z.infer<typeof userAccount>;

export function readUserAccount(ctx: BaseContext, token: string): Promise<UserAccount> {
  return getJson(ctx, token, new URL(`${API_BASE}/user_account`), userAccount);
}

export function boardOptions(capabilities: unknown): SettingOptions {
  const parsed = boardCapabilities.safeParse(capabilities);
  if (!parsed.success) return {};
  return { boardId: parsed.data.boards.map(({ id, name }) => ({ value: id, label: name })) };
}
