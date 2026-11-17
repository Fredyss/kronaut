import type { Channel } from '../../../records/channels/queries.ts';
import type { Destination } from '../../../records/posts/queries.ts';

type Settings = Destination['settings'];

export const PIN_TITLE_MAX = 100;
const PIN_LINK_MAX = 2048;
export const PINTEREST_DEFAULT: Settings = {};

export interface PinterestFields {
  readonly boardId: string;
  readonly title: string;
  readonly link: string;
}

export interface BoardOption {
  readonly value: string;
  readonly label: string;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function pinterestFields({ boardId, title, link }: Settings): PinterestFields {
  return { boardId: text(boardId), title: text(title), link: text(link) };
}

export function boardOptions(channel: Channel): readonly BoardOption[] {
  return channel.settingOptions.boardId ?? [];
}

export function linkProblem(link: string): 'invalid' | 'too_long' | null {
  if (link === '') return null;
  if (link.length > PIN_LINK_MAX) return 'too_long';
  return URL.canParse(link) && new URL(link).protocol === 'https:' ? null : 'invalid';
}

export function invalidPin(settings: Settings | undefined): boolean {
  if (settings === undefined) return false;
  const { title, link } = pinterestFields(settings);
  return title.length > PIN_TITLE_MAX || linkProblem(link) !== null;
}
