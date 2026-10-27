import { describe, expect, it } from 'vitest';
import { canonicalJson } from './jcs.ts';

describe('canonicalJson', () => {
  it('serialises scalars', () => {
    expect(canonicalJson(null)).toBe('null');
    expect(canonicalJson(true)).toBe('true');
    expect(canonicalJson(false)).toBe('false');
    expect(canonicalJson('')).toBe('""');
    expect(canonicalJson('abc')).toBe('"abc"');
    expect(canonicalJson(0)).toBe('0');
    expect(canonicalJson(42)).toBe('42');
    expect(canonicalJson(-7)).toBe('-7');
  });

  it('serialises -0 as 0', () => {
    expect(canonicalJson(-0)).toBe('0');
    expect(canonicalJson({ a: -0 })).toBe('{"a":0}');
    expect(canonicalJson([-0])).toBe('[0]');
  });

  it('accepts the safe integer range edges', () => {
    expect(canonicalJson(Number.MAX_SAFE_INTEGER)).toBe('9007199254740991');
    expect(canonicalJson(Number.MIN_SAFE_INTEGER)).toBe('-9007199254740991');
  });

  it.each([
    ['a float', 1.5],
    ['a tiny float', 1e-7],
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
    ['-Infinity', Number.NEGATIVE_INFINITY],
    ['an unsafe integer', 2 ** 53],
    ['a large integer-valued float', 1e21],
    ['a negative unsafe integer', -(2 ** 53)],
  ])('rejects %s', (_label, value) => {
    expect(() => canonicalJson(value)).toThrow(TypeError);
    expect(() => canonicalJson({ nested: [value] })).toThrow(TypeError);
  });

  it('writes no whitespace', () => {
    expect(canonicalJson({ a: [1, 2, { b: null }], c: 'x y' })).toBe(
      '{"a":[1,2,{"b":null}],"c":"x y"}',
    );
    expect(canonicalJson([])).toBe('[]');
    expect(canonicalJson({})).toBe('{}');
  });

  it('sorts object keys recursively and keeps array order', () => {
    expect(canonicalJson({ b: 1, a: { d: 1, c: 2 }, c: [3, 1, 2] })).toBe(
      '{"a":{"c":2,"d":1},"b":1,"c":[3,1,2]}',
    );
  });

  it('sorts keys by UTF-16 code unit, not by code point (RFC 8785 section 3.2.3)', () => {
    const input = {
      '€': 'Euro Sign',
      '\r': 'Carriage Return',
      דּ: 'Hebrew Letter Dalet With Dagesh',
      '1': 'One',
      '😀': 'Emoji: Grinning Face',
      '\u0080': 'Control',
      ö: 'Latin Small Letter O With Diaeresis',
    };
    const expected =
      '{"\\r":"Carriage Return","1":"One","\u0080":"Control",' +
      '"ö":"Latin Small Letter O With Diaeresis","€":"Euro Sign",' +
      '"😀":"Emoji: Grinning Face","דּ":"Hebrew Letter Dalet With Dagesh"}';
    expect(canonicalJson(input)).toBe(expected);
  });

  it('sorts a supplementary-plane key before a BMP key above the surrogate range', () => {
    expect(Object.keys({ דּ: 1, '😀': 2 })).toEqual(['דּ', '😀']);
    expect(canonicalJson({ דּ: 1, '😀': 2 })).toBe('{"😀":2,"דּ":1}');
  });

  it('sorts integer-like keys as strings', () => {
    expect(canonicalJson({ '10': 'a', '9': 'b', '2': 'c' })).toBe('{"10":"a","2":"c","9":"b"}');
  });

  it('is independent of property insertion order', () => {
    const forward = { a: 1, b: 2, c: { x: 1, y: 2 } };
    const backward = { c: { y: 2, x: 1 }, b: 2, a: 1 };
    expect(canonicalJson(forward)).toBe(canonicalJson(backward));
  });

  it('escapes control characters, quotes and backslashes like JSON.stringify', () => {
    const allControls = Array.from({ length: 0x20 }, (_, i) => String.fromCharCode(i)).join('');
    expect(canonicalJson(allControls)).toBe(
      '"\\u0000\\u0001\\u0002\\u0003\\u0004\\u0005\\u0006\\u0007\\b\\t\\n\\u000b\\f\\r' +
        '\\u000e\\u000f\\u0010\\u0011\\u0012\\u0013\\u0014\\u0015\\u0016\\u0017' +
        '\\u0018\\u0019\\u001a\\u001b\\u001c\\u001d\\u001e\\u001f"',
    );
    expect(canonicalJson('say "hi"\\')).toBe('"say \\"hi\\"\\\\"');
  });

  it('does not escape DEL, U+2028 or non-ASCII characters', () => {
    expect(canonicalJson('\u007f  č😀')).toBe('"\u007f  č😀"');
  });

  it('escapes keys the same way as values', () => {
    expect(canonicalJson({ 'a"b\n': 1 })).toBe('{"a\\"b\\n":1}');
  });

  it('omits object properties whose value is undefined', () => {
    expect(canonicalJson({ a: undefined, b: 1 })).toBe('{"b":1}');
    expect(canonicalJson({ a: undefined })).toBe('{}');
  });

  it('accepts null-prototype objects', () => {
    expect(canonicalJson(Object.assign(Object.create(null), { b: 1, a: 2 }))).toBe('{"a":2,"b":1}');
  });

  it('keeps an own __proto__ key as data', () => {
    const parsed = JSON.parse('{"__proto__":{"x":1},"a":2}');
    expect(canonicalJson(parsed)).toBe('{"__proto__":{"x":1},"a":2}');
  });

  it('allows a shared (non-cyclic) reference', () => {
    const shared = { a: 1 };
    expect(canonicalJson({ x: shared, y: [shared, shared] })).toBe(
      '{"x":{"a":1},"y":[{"a":1},{"a":1}]}',
    );
  });

  it.each([
    ['undefined', undefined],
    ['a bigint', 1n],
    ['a symbol', Symbol('x')],
    ['a function', () => 1],
    ['an undefined array element', [1, undefined]],
    ['a sparse array hole', Object.assign(new Array(2), [1])],
    ['a function property', { f: () => 1 }],
    ['a symbol property', { s: Symbol('x') }],
    ['a bigint property', { n: 1n }],
    ['a Date', new Date(0)],
    ['a Map', new Map([['a', 1]])],
    ['a Set', new Set([1])],
    ['a RegExp', /x/],
    ['a typed array', new Uint8Array(2)],
    ['an Error', new Error('x')],
    ['a boxed string', Object('x')],
    ['a boxed number', Object(1)],
    [
      'a class instance',
      new (class Point {
        x = 1;
      })(),
    ],
    ['an object with a custom prototype', Object.create({ inherited: 1 })],
    ['an array subclass', new (class List extends Array {})()],
    ['a Date inside an object', { when: new Date(0) }],
    ['a class instance inside an array', [new (class Box {})()]],
  ])('rejects %s', (_label, value) => {
    expect(() => canonicalJson(value)).toThrow(TypeError);
  });

  it('rejects cycles', () => {
    const object: Record<string, unknown> = { a: 1 };
    object.self = object;
    expect(() => canonicalJson(object)).toThrow(TypeError);
    const array: unknown[] = [];
    array.push(array);
    expect(() => canonicalJson(array)).toThrow(TypeError);
    const indirect: Record<string, unknown> = {};
    indirect.list = [{ back: indirect }];
    expect(() => canonicalJson(indirect)).toThrow(TypeError);
  });

  it('rejects strings that are not well-formed UTF-16', () => {
    expect(() => canonicalJson('\ud800')).toThrow(TypeError);
    expect(() => canonicalJson('a\udc00b')).toThrow(TypeError);
    expect(() => canonicalJson(['x', '\ud83d'])).toThrow(TypeError);
    expect(() => canonicalJson({ k: '\udfff' })).toThrow(TypeError);
    expect(() => canonicalJson({ '\ud800': 1 })).toThrow(TypeError);
    expect(canonicalJson('😀')).toBe('"😀"');
  });
});
