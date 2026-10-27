import { Schema } from 'prosemirror-model';
import { DocError } from './canonical.ts';

export const DOC_SCHEMA_V = 1;

export const schemaV1 = new Schema({
  nodes: {
    doc: { content: 'paragraph+' },
    paragraph: { content: 'inline*', group: 'block' },
    text: { group: 'inline' },
    hardBreak: { inline: true, group: 'inline', selectable: false },
  },
});

export function schemaFor(v: number): Schema {
  if (v === 1) {
    return schemaV1;
  }
  throw new DocError('unknown_schema_version');
}

export interface NodeJson {
  readonly type: string;
  readonly text?: string;
  readonly content?: readonly NodeJson[];
}

export interface DocJson {
  readonly type: 'doc';
  readonly content: readonly NodeJson[];
}
