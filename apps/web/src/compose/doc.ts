export interface DocText {
  readonly type: 'text';
  readonly text: string;
}

export interface DocHardBreak {
  readonly type: 'hardBreak';
}

export type DocInline = DocText | DocHardBreak;

export interface DocParagraph {
  readonly type: 'paragraph';
  readonly content?: readonly DocInline[];
}

export interface Doc {
  readonly type: 'doc';
  readonly content: readonly DocParagraph[];
}

export const EMPTY_DOC: Doc = { type: 'doc', content: [{ type: 'paragraph' }] };

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function children(node: Readonly<Record<string, unknown>>): readonly unknown[] {
  return Array.isArray(node.content) ? node.content : [];
}

function paragraph(inline: readonly DocInline[]): DocParagraph {
  return inline.length === 0 ? { type: 'paragraph' } : { type: 'paragraph', content: inline };
}

export function textToParagraphs(text: string): DocParagraph[] {
  return text
    .normalize('NFC')
    .split(/\r\n|\r|\n/)
    .map((line) => paragraph(line === '' ? [] : [{ type: 'text', text: line }]));
}

function toInline(node: unknown): DocInline | null {
  if (!isRecord(node)) return null;
  if (node.type === 'hardBreak') return { type: 'hardBreak' };
  if (node.type !== 'text' || typeof node.text !== 'string') return null;
  const text = node.text.normalize('NFC');
  return text === '' ? null : { type: 'text', text };
}

function merged(inline: readonly DocInline[]): DocInline[] {
  const out: DocInline[] = [];
  for (const node of inline) {
    const last = out.at(-1);
    if (node.type === 'text' && last?.type === 'text') {
      out[out.length - 1] = { type: 'text', text: `${last.text}${node.text}`.normalize('NFC') };
    } else {
      out.push(node);
    }
  }
  return out;
}

export function toDoc(json: unknown): Doc {
  if (!isRecord(json)) return EMPTY_DOC;
  const paragraphs = children(json).flatMap((node) => {
    if (!isRecord(node) || node.type !== 'paragraph') return [];
    return [paragraph(merged(children(node).flatMap((child) => toInline(child) ?? [])))];
  });
  return paragraphs.length === 0 ? EMPTY_DOC : { type: 'doc', content: paragraphs };
}

export function docParagraphs(json: unknown): { readonly key: string; readonly text: string }[] {
  return toDoc(json).content.map((p, index) => ({
    key: `p${index}`,
    text: (p.content ?? []).map((node) => (node.type === 'hardBreak' ? '\n' : node.text)).join(''),
  }));
}

export function docText(json: unknown): string {
  return docParagraphs(json)
    .map((p) => p.text)
    .join('\n');
}

export function isBlank(doc: Doc): boolean {
  return doc.content.every((p) =>
    (p.content ?? []).every((node) => node.type === 'hardBreak' || node.text.trim() === ''),
  );
}
