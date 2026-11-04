import type { FeedItem } from './parse.ts';

export const DEFAULT_TEMPLATE = '{title} {link}';
const PLACEHOLDER = /\{(title|link|summary)\}/g;

type Fields = Pick<FeedItem, 'title' | 'link' | 'summary'>;

export function renderText(template: string, item: Fields): string {
  const values = { title: item.title, link: item.link ?? '', summary: item.summary };
  return template
    .replace(PLACEHOLDER, (_, name: keyof typeof values) => values[name])
    .normalize('NFC');
}

function paragraph(line: string) {
  return line === ''
    ? { type: 'paragraph' }
    : { type: 'paragraph', content: [{ type: 'text', text: line }] };
}

export function docOf(text: string) {
  const lines = text.replaceAll('\r\n', '\n').split('\n');
  return { type: 'doc', content: lines.map(paragraph) };
}
