import type { Node as PmNode } from 'prosemirror-model';
import { canonicalJson } from './jcs.ts';
import { DOC_SCHEMA_V, type DocJson, schemaFor } from './schema.ts';

export type DocErrorCode = 'invalid_doc' | 'unknown_schema_version';

const MAX_DEPTH = 64;

const MESSAGES: Readonly<Record<DocErrorCode, string>> = {
  invalid_doc: 'document is not valid for its schema',
  unknown_schema_version: 'unknown document schema version',
};

export class DocError extends Error {
  readonly code: DocErrorCode;

  constructor(code: DocErrorCode, options?: ErrorOptions) {
    super(MESSAGES[code], options);
    this.name = 'DocError';
    this.code = code;
  }
}

interface MutableNode {
  type: string;
  text?: string;
  content?: MutableNode[];
}

function copyArray(value: unknown[], depth: number, ancestors: Set<object>): unknown[] {
  if (Object.getPrototypeOf(value) !== Array.prototype) {
    throw new DocError('invalid_doc');
  }
  const out: unknown[] = [];
  for (let i = 0; i < value.length; i++) {
    out.push(copyPlain(value[i], depth + 1, ancestors));
  }
  return out;
}

function copyRecord(value: object, depth: number, ancestors: Set<object>): unknown {
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) {
    throw new DocError('invalid_doc');
  }
  const record = value as Record<string, unknown>;
  const entries: [string, unknown][] = [];
  for (const key of Object.keys(record)) {
    const member = record[key];
    if (member !== undefined) {
      entries.push([key, copyPlain(member, depth + 1, ancestors)]);
    }
  }
  return Object.fromEntries(entries);
}

function copyPlain(value: unknown, depth: number, ancestors: Set<object>): unknown {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new DocError('invalid_doc');
    }
    return value;
  }
  if (typeof value !== 'object' || depth > MAX_DEPTH || ancestors.has(value)) {
    throw new DocError('invalid_doc');
  }
  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      return copyArray(value, depth, ancestors);
    }
    return copyRecord(value, depth, ancestors);
  } finally {
    ancestors.delete(value);
  }
}

function normalizeText(text: string): string {
  let current = text;
  for (;;) {
    const next = current.replaceAll('\r\n', '\n').normalize('NFC');
    if (next === current) {
      return current;
    }
    current = next;
  }
}

function normalizeTexts(node: MutableNode): void {
  if (node.type === 'text' && typeof node.text === 'string') {
    node.text = normalizeText(node.text);
  }
  if (node.content) {
    for (const child of node.content) {
      normalizeTexts(child);
    }
  }
}

export function canonicalizeDoc(json: unknown, v: number = DOC_SCHEMA_V): DocJson {
  const schema = schemaFor(v);
  const copy = copyPlain(json, 1, new Set());
  let node: PmNode;
  try {
    node = schema.nodeFromJSON(copy);
    node.check();
  } catch (error) {
    if (error instanceof RangeError || error instanceof TypeError) {
      throw new DocError('invalid_doc', { cause: error });
    }
    throw error;
  }
  if (node.type !== schema.topNodeType) {
    throw new DocError('invalid_doc');
  }
  const out = node.toJSON() as MutableNode;
  normalizeTexts(out);
  return out as unknown as DocJson;
}

export function isCanonical(json: unknown, v: number = DOC_SCHEMA_V): boolean {
  try {
    const canonical = canonicalizeDoc(json, v);
    return canonicalJson(json) === canonicalJson(canonical);
  } catch (error) {
    if (error instanceof DocError || error instanceof TypeError) {
      return false;
    }
    throw error;
  }
}
