export const ATTRIBUTE = '@_';

export type Node = unknown;

export function record(node: Node): Record<string, Node> | null {
  return typeof node === 'object' && node !== null && !Array.isArray(node)
    ? (node as Record<string, Node>)
    : null;
}

export function textOf(node: Node): string {
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(textOf).join(' ');
  const fields = record(node);
  if (fields === null) return '';
  return Object.entries(fields)
    .filter(([name]) => !name.startsWith(ATTRIBUTE))
    .map(([, value]) => textOf(value))
    .join(' ');
}

export function attribute(node: Node, name: string): string | null {
  const value = record(node)?.[`${ATTRIBUTE}${name}`];
  return typeof value === 'string' ? value : null;
}

export function list(node: Node): Node[] {
  if (node === undefined) return [];
  return Array.isArray(node) ? node : [node];
}
