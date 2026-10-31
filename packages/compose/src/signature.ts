import { toPlainText } from './plain-text.ts';
import type { DocJson } from './schema.ts';

export function appendSignature<T extends DocJson>(doc: T, signature: DocJson | null): T {
  if (signature === null || toPlainText(doc).trim() === '') return doc;
  return { ...doc, content: [...doc.content, ...signature.content] };
}
