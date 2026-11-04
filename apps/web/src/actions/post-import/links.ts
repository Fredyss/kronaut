import { MAX_IMAGES } from '../../composer/compose/media/media.ts';

const URL_MAX_LENGTH = 2048;
export const MAX_FILE_LINKS = 500;

export type LinkProblem =
  | { readonly kind: 'media_link_invalid' }
  | { readonly kind: 'media_too_many'; readonly max: number };

export interface FileLinksProblem {
  readonly kind: 'media_file_too_many';
  readonly max: number;
}

function linkOf(part: string): string | null {
  if (!URL.canParse(part)) return null;
  const url = new URL(part);
  if (url.protocol !== 'https:') return null;
  if (url.username !== '' || url.password !== '' || url.href.length > URL_MAX_LENGTH) return null;
  return url.href;
}

export function parseLinks(column: string): { readonly urls: string[] } | LinkProblem {
  const parts = column.split(/[\s|]+/).filter((part) => part !== '');
  if (parts.length > MAX_IMAGES) return { kind: 'media_too_many', max: MAX_IMAGES };
  const links = parts.map(linkOf);
  if (links.includes(null)) return { kind: 'media_link_invalid' };
  return { urls: links.filter((link) => link !== null) };
}

export function distinctUrls(
  lists: readonly (readonly string[])[],
): { readonly urls: string[] } | FileLinksProblem {
  const urls = [...new Set(lists.flat())];
  if (urls.length > MAX_FILE_LINKS) return { kind: 'media_file_too_many', max: MAX_FILE_LINKS };
  return { urls };
}

export function hostOf(url: string): string {
  return URL.canParse(url) ? new URL(url).host : '';
}
