import { describe, expect, it } from 'vitest';
import { DocError } from './doc-error.ts';
import { DOC_SCHEMA_V, schemaFor, schemaV1 } from './schema.ts';

describe('schemaV1', () => {
  it('is version 1', () => {
    expect(DOC_SCHEMA_V).toBe(1);
  });

  it('has exactly the Tiptap node names and no marks', () => {
    expect(Object.keys(schemaV1.nodes).sort()).toEqual(['doc', 'hardBreak', 'paragraph', 'text']);
    expect(Object.keys(schemaV1.marks)).toEqual([]);
    expect(schemaV1.topNodeType.name).toBe('doc');
  });

  it('requires at least one paragraph in the doc', () => {
    expect(schemaV1.nodes.doc?.spec.content).toBe('paragraph+');
    expect(schemaV1.nodes.paragraph?.spec.content).toBe('inline*');
  });

  it('makes hardBreak an inline leaf that cannot be selected', () => {
    const hardBreak = schemaV1.nodes.hardBreak;
    expect(hardBreak?.isInline).toBe(true);
    expect(hardBreak?.isLeaf).toBe(true);
    expect(hardBreak?.spec.selectable).toBe(false);
  });
});

describe('schemaFor', () => {
  it('returns schemaV1 for version 1', () => {
    expect(schemaFor(1)).toBe(schemaV1);
    expect(schemaFor(DOC_SCHEMA_V)).toBe(schemaV1);
  });

  it.each([0, 2, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'throws unknown_schema_version for %s',
    (v) => {
      const error = (() => {
        try {
          schemaFor(v);
        } catch (caught) {
          return caught;
        }
        return null;
      })();
      expect(error).toBeInstanceOf(DocError);
      expect((error as DocError).code).toBe('unknown_schema_version');
    },
  );
});
