function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNothing(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (Array.isArray(value)) return value.length === 0;
  return isRecord(value) && Object.keys(value).length === 0;
}

function onlyKeys(node: Readonly<Record<string, unknown>>, keys: readonly string[]): boolean {
  return Object.entries(node).every(([key, value]) => keys.includes(key) || isNothing(value));
}

function holdsOnly(
  node: Readonly<Record<string, unknown>>,
  isChild: (child: unknown) => boolean,
): boolean {
  const { content } = node;
  if (content === undefined) return onlyKeys(node, ['type']);
  return Array.isArray(content) && onlyKeys(node, ['type', 'content']) && content.every(isChild);
}

function isPlainInline(node: unknown): boolean {
  if (!isRecord(node)) return false;
  if (node.type === 'hardBreak') return onlyKeys(node, ['type']);
  return node.type === 'text' && typeof node.text === 'string' && onlyKeys(node, ['type', 'text']);
}

function isPlainParagraph(node: unknown): boolean {
  return isRecord(node) && node.type === 'paragraph' && holdsOnly(node, isPlainInline);
}

export function isPlainDoc(json: unknown): boolean {
  if (!isRecord(json) || (json.type !== 'doc' && json.type !== undefined)) return false;
  return holdsOnly(json, isPlainParagraph);
}
