import { describe, expect, it } from 'vitest';
import { canonicalizeDoc, isCanonical } from './canonical.ts';
import { DocError } from './doc-error.ts';
import { canonicalJson } from './jcs.ts';
import { schemaV1 } from './schema.ts';

const text = (value: string, extra: object = {}) => ({ type: 'text', text: value, ...extra });
const para = (...content: unknown[]) =>
  content.length === 0 ? { type: 'paragraph' } : { type: 'paragraph', content };
const doc = (...content: unknown[]) => ({ type: 'doc', content });
const hardBreak = { type: 'hardBreak' };

function firstText(json: unknown): string | undefined {
  return canonicalizeDoc(json).content[0]?.content?.[0]?.text;
}

function failure(run: () => unknown): DocError {
  try {
    run();
  } catch (error) {
    if (error instanceof DocError) {
      return error;
    }
    throw error;
  }
  throw new Error('expected a DocError');
}

describe('canonicalizeDoc', () => {
  it('returns a fresh canonical copy of a Tiptap document', () => {
    const input = doc(para(text('Hello'), hardBreak, text('world')), para());
    const output = canonicalizeDoc(input);
    expect(output).toEqual(input);
    expect(output).not.toBe(input);
  });

  it('never mutates its input', () => {
    const input = doc(para(text('č\r\nx', { extra: 1 })));
    const before = structuredClone(input);
    canonicalizeDoc(input);
    expect(input).toEqual(before);
  });

  it('defaults to schema version 1', () => {
    const input = doc(para(text('a')));
    expect(canonicalizeDoc(input, 1)).toEqual(canonicalizeDoc(input));
  });

  it("normalises NFD 'c\\u030C' to 'č' (U+010D)", () => {
    expect(firstText(doc(para(text('č'))))).toBe('č');
  });

  it('leaves text that is already NFC unchanged', () => {
    expect(firstText(doc(para(text('Žluťoučký kůň'))))).toBe('Žluťoučký kůň');
  });

  it('replaces CRLF with LF and leaves a lone CR untouched', () => {
    expect(firstText(doc(para(text('a\r\nb\rc\nd'))))).toBe('a\nb\rc\nd');
  });

  it('does not trim or touch any other whitespace', () => {
    const raw = '  \ta b  \n ';
    expect(firstText(doc(para(text(raw))))).toBe(raw);
  });

  it('is a fixed point when CR runs end in LF', () => {
    expect(firstText(doc(para(text('x\r\r\n'))))).toBe('x\n');
  });

  it('merges adjacent text nodes', () => {
    const output = canonicalizeDoc(
      doc(para(text('a'), text('b'), hardBreak, text('c'), text('d'))),
    );
    expect(output.content[0]?.content).toEqual([text('ab'), hardBreak, text('cd')]);
  });

  it('normalises across the boundary of adjacent text nodes', () => {
    expect(firstText(doc(para(text('c'), text('̌'))))).toBe('č');
    expect(firstText(doc(para(text('a\r'), text('\nb'))))).toBe('a\nb');
  });

  it('drops unknown keys', () => {
    const input = doc(
      { type: 'paragraph', bar: 2, content: [text('hi', { foo: 1 })] },
      { type: 'paragraph', nested: { deep: [1, 2, 3] } },
    );
    expect(canonicalizeDoc({ ...input, extra: true })).toEqual(doc(para(text('hi')), para()));
  });

  it('drops attrs the schema does not define', () => {
    const input = doc({ type: 'paragraph', attrs: { textAlign: 'left' }, content: [text('x')] });
    expect(canonicalizeDoc(input)).toEqual(doc(para(text('x'))));
    expect(canonicalizeDoc(doc(para({ type: 'hardBreak', attrs: { x: 1 } })))).toEqual(
      doc(para(hardBreak)),
    );
    expect(canonicalizeDoc({ type: 'doc', attrs: { x: 1 }, content: [para()] })).toEqual(
      doc(para()),
    );
  });

  it('drops content on a text node', () => {
    const input = doc(para({ type: 'text', text: 'a', content: [text('b')] }));
    expect(canonicalizeDoc(input)).toEqual(doc(para(text('a'))));
  });

  it('rejects marks of a type the schema does not have', () => {
    const input = doc(para(text('hi', { marks: [{ type: 'bold' }] })));
    expect(failure(() => canonicalizeDoc(input)).code).toBe('invalid_doc');
  });

  it('drops an empty marks array', () => {
    expect(canonicalizeDoc(doc(para(text('hi', { marks: [] }))))).toEqual(doc(para(text('hi'))));
  });

  it('rejects an empty text node', () => {
    expect(failure(() => canonicalizeDoc(doc(para(text(''))))).code).toBe('invalid_doc');
  });

  it('rejects an empty doc because paragraph+ needs a child', () => {
    expect(failure(() => canonicalizeDoc({ type: 'doc', content: [] })).code).toBe('invalid_doc');
    expect(failure(() => canonicalizeDoc({ type: 'doc' })).code).toBe('invalid_doc');
  });

  it('keeps an empty paragraph without a content key', () => {
    const output = canonicalizeDoc(doc(para()));
    expect(output.content[0]).toEqual({ type: 'paragraph' });
    expect('content' in (output.content[0] ?? {})).toBe(false);
  });

  it.each([
    ['a paragraph at the top', para(text('a'))],
    ['a text node at the top', text('a')],
    ['an unknown node type', doc({ type: 'heading', content: [text('a')] })],
    ['a paragraph inside a paragraph', doc(para(para(text('a'))))],
    ['a text node directly in the doc', doc(text('a'))],
    ['content on a hardBreak', doc(para({ type: 'hardBreak', content: [text('a')] }))],
    ['content that is not an array', { type: 'doc', content: {} }],
    ['a null child', doc(para(null))],
    ['a missing type', { content: [para()] }],
    ['a non-string text', doc(para({ type: 'text', text: 5 }))],
  ])('rejects %s', (_label, input) => {
    expect(failure(() => canonicalizeDoc(input)).code).toBe('invalid_doc');
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['a string', 'abc'],
    ['a number', 5],
    ['a boolean', true],
    ['an array', [doc(para())]],
    ['a Map', new Map()],
    ['a Date', new Date(0)],
    ['a function', () => doc(para())],
    [
      'a class instance',
      new (class Doc {
        type = 'doc';
        content = [para()];
      })(),
    ],
    ['a prosemirror Node', schemaV1.nodeFromJSON(doc(para()))],
    ['a bigint child', doc(para({ type: 'text', text: 'a', extra: 1n }))],
    ['a symbol child', doc(para({ type: 'text', text: 'a', extra: Symbol('x') }))],
    ['a function child', doc(para({ type: 'text', text: 'a', extra: () => 1 }))],
    ['NaN', doc(para({ type: 'text', text: 'a', extra: Number.NaN }))],
    ['Infinity', doc(para({ type: 'text', text: 'a', extra: Number.POSITIVE_INFINITY }))],
    ['a Date child', doc(para({ type: 'text', text: 'a', extra: new Date(0) }))],
    ['an undefined array element', doc(para(text('a'), undefined))],
    [
      'a sparse array',
      doc({ type: 'paragraph', content: Object.assign(new Array(2), [text('a')]) }),
    ],
  ])('rejects %s as not a plain JSON tree', (_label, input) => {
    expect(failure(() => canonicalizeDoc(input)).code).toBe('invalid_doc');
  });

  it('rejects cycles before reaching prosemirror', () => {
    const cyclic: Record<string, unknown> = { type: 'doc' };
    cyclic.content = [cyclic];
    const error = failure(() => canonicalizeDoc(cyclic));
    expect(error.code).toBe('invalid_doc');
    expect(error.cause).toBeUndefined();
  });

  it('rejects nesting deeper than 64 before reaching prosemirror', () => {
    let deep: unknown = { type: 'text', text: 'a' };
    for (let i = 0; i < 70; i++) {
      deep = { wrapper: deep };
    }
    const error = failure(() => canonicalizeDoc(doc(para({ type: 'text', text: 'a', deep }))));
    expect(error.code).toBe('invalid_doc');
    expect(error.cause).toBeUndefined();
  });

  it('accepts the same object referenced twice because that is not a cycle', () => {
    const shared = text('a');
    expect(canonicalizeDoc(doc(para(shared, hardBreak, shared)))).toEqual(
      doc(para(text('a'), hardBreak, text('a'))),
    );
  });

  it('treats undefined object properties as absent', () => {
    expect(
      canonicalizeDoc(doc({ type: 'paragraph', content: [text('a')], extra: undefined })),
    ).toEqual(doc(para(text('a'))));
  });

  it('accepts null-prototype objects', () => {
    const node = Object.assign(Object.create(null), { type: 'paragraph' });
    expect(canonicalizeDoc(doc(node))).toEqual(doc(para()));
  });

  it('does not let a __proto__ key pollute anything', () => {
    const parsed = JSON.parse(
      '{"type":"doc","__proto__":{"polluted":true},"content":[{"type":"paragraph"}]}',
    );
    expect(canonicalizeDoc(parsed)).toEqual(doc(para()));
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('throws unknown_schema_version for an unknown version', () => {
    const error = failure(() => canonicalizeDoc(doc(para()), 2));
    expect(error.code).toBe('unknown_schema_version');
  });

  it('keeps the original prosemirror error as cause but never puts text in the message', () => {
    const secret = 'SECRET-DRAFT-TEXT';
    const error = failure(() =>
      canonicalizeDoc(doc(para(text(secret, { marks: [{ type: secret }] })))),
    );
    expect(error.code).toBe('invalid_doc');
    expect(error.message).not.toContain(secret);
    expect(error.cause).toBeInstanceOf(RangeError);

    const structural = failure(() => canonicalizeDoc(doc(para(para(text(secret))))));
    expect(structural.message).not.toContain(secret);
    expect(structural.cause).toBeInstanceOf(RangeError);
  });

  it.each([
    ['NFD with CRLF', doc(para(text('č\r\n'), hardBreak, text('é')))],
    ['CR runs', doc(para(text('x\r\r\r\n\r\ny')))],
    ['split decomposed characters', doc(para(text('c'), text('̌'), text('\r'), text('\n')))],
    ['hangul jamo', doc(para(text('각')))],
    ['unknown keys', doc({ type: 'paragraph', attrs: { a: 1 }, content: [text('a', { b: 2 })] })],
  ])('is idempotent for %s', (_label, input) => {
    const once = canonicalizeDoc(input);
    expect(canonicalizeDoc(once)).toEqual(once);
    expect(isCanonical(once)).toBe(true);
  });
});

describe('DocError', () => {
  it('carries a code, a fixed message and the cause', () => {
    const cause = new RangeError('boom');
    const error = new DocError('invalid_doc', { cause });
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('DocError');
    expect(error.code).toBe('invalid_doc');
    expect(error.cause).toBe(cause);
    expect(new DocError('unknown_schema_version').code).toBe('unknown_schema_version');
  });
});

describe('isCanonical', () => {
  it('is true for canonical documents', () => {
    expect(isCanonical(doc(para(text('Žluťoučký'), hardBreak, text('kůň')), para()))).toBe(true);
    expect(isCanonical(canonicalizeDoc(doc(para(text('č')))))).toBe(true);
  });

  it('is false when input differs from its canonical form', () => {
    expect(isCanonical(doc(para(text('č'))))).toBe(false);
    expect(isCanonical(doc(para(text('a\r\nb'))))).toBe(false);
    expect(isCanonical(doc(para(text('a'), text('b'))))).toBe(false);
    expect(isCanonical(doc({ type: 'paragraph', attrs: { a: 1 } }))).toBe(false);
    expect(isCanonical({ ...doc(para()), extra: true })).toBe(false);
  });

  it('is false for invalid documents without throwing', () => {
    expect(isCanonical({ type: 'doc', content: [] })).toBe(false);
    expect(isCanonical(null)).toBe(false);
    expect(isCanonical(new Map())).toBe(false);
    expect(isCanonical(doc(para(text('a', { marks: [{ type: 'bold' }] }))))).toBe(false);
  });

  it('is false when the input cannot be serialised as JCS', () => {
    expect(isCanonical(doc(para(text('a', { weight: 1.5 }))))).toBe(false);
    expect(isCanonical(doc(para(text('\ud800'))))).toBe(false);
  });

  it('is false for an unknown schema version', () => {
    expect(isCanonical(doc(para()), 2)).toBe(false);
  });

  it('is false instead of overflowing the stack on deeply nested extra keys', () => {
    let deep: unknown = [];
    for (let i = 0; i < 100_000; i++) {
      deep = [deep];
    }
    expect(isCanonical({ ...doc(para(text('a'))), extra: deep })).toBe(false);
  });

  it('agrees with a JCS comparison of input and output', () => {
    const input = doc(para(text('a')));
    expect(isCanonical(input)).toBe(canonicalJson(input) === canonicalJson(canonicalizeDoc(input)));
  });
});
