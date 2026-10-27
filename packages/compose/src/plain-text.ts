import type { DocJson, NodeJson } from './schema.ts';

function inlineText(node: NodeJson): string {
  if (node.type === 'hardBreak') {
    return '\n';
  }
  return node.text ?? '';
}

function paragraphText(paragraph: NodeJson): string {
  return (paragraph.content ?? []).map(inlineText).join('');
}

export function toPlainText(doc: DocJson): string {
  return doc.content.map(paragraphText).join('\n');
}
