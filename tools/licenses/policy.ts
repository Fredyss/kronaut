export const ALLOWED: ReadonlySet<string> = new Set([
  'MIT',
  'MIT-0',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'ISC',
  '0BSD',
  'BlueOak-1.0.0',
  'CC0-1.0',
  'MPL-2.0',
  'Python-2.0',
  'Unlicense',
]);

export const EXCEPTIONS: Readonly<Record<string, string>> = {};

const TOKEN = /\(|\)|[^\s()]+/g;

function evaluate(tokens: string[], allowed: ReadonlySet<string>): boolean | null {
  let pos = 0;

  const atom = (): boolean | null => {
    const token = tokens[pos++];
    if (token === undefined || token === ')' || token === 'AND' || token === 'OR') return null;
    if (token !== '(') return allowed.has(token);
    const inner = or();
    if (inner === null || tokens[pos++] !== ')') return null;
    return inner;
  };

  const chain = (
    operator: string,
    operand: () => boolean | null,
    join: (a: boolean, b: boolean) => boolean,
  ): boolean | null => {
    let result = operand();
    while (result !== null && tokens[pos] === operator) {
      pos++;
      const next = operand();
      result = next === null ? null : join(result, next);
    }
    return result;
  };

  const and = () => chain('AND', atom, (a, b) => a && b);
  const or = () => chain('OR', and, (a, b) => a || b);

  const result = or();
  return pos === tokens.length ? result : null;
}

export function isAllowed(
  name: string,
  license: string,
  exceptions: Readonly<Record<string, string>> = EXCEPTIONS,
  allowed: ReadonlySet<string> = ALLOWED,
): boolean {
  if (Object.hasOwn(exceptions, name)) return true;
  const tokens = license.match(TOKEN) ?? [];
  return evaluate(tokens, allowed) === true;
}
