function assertWellFormed(value: string): void {
  if (!value.isWellFormed()) {
    throw new TypeError('canonicalJson: string is not well-formed UTF-16');
  }
}

function compareCodeUnits(a: string, b: string): number {
  if (a < b) {
    return -1;
  }
  return a > b ? 1 : 0;
}

function serializeNumber(value: number): string {
  if (!Number.isSafeInteger(value)) {
    throw new TypeError('canonicalJson: numbers must be safe integers');
  }
  return Object.is(value, -0) ? '0' : String(value);
}

function serializeArray(value: readonly unknown[], ancestors: Set<object>): string {
  if (Object.getPrototypeOf(value) !== Array.prototype) {
    throw new TypeError('canonicalJson: array has a non-plain prototype');
  }
  const parts: string[] = [];
  for (let i = 0; i < value.length; i++) {
    const element = value[i];
    if (element === undefined) {
      throw new TypeError('canonicalJson: undefined array element');
    }
    parts.push(serialize(element, ancestors));
  }
  return `[${parts.join(',')}]`;
}

function serializeObject(value: object, ancestors: Set<object>): string {
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) {
    throw new TypeError('canonicalJson: object has a non-plain prototype');
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort(compareCodeUnits);
  const parts: string[] = [];
  for (const key of keys) {
    const member = record[key];
    if (member === undefined) {
      continue;
    }
    assertWellFormed(key);
    parts.push(`${JSON.stringify(key)}:${serialize(member, ancestors)}`);
  }
  return `{${parts.join(',')}}`;
}

function serialize(value: unknown, ancestors: Set<object>): string {
  if (value === null) {
    return 'null';
  }
  switch (typeof value) {
    case 'boolean':
      return value ? 'true' : 'false';
    case 'number':
      return serializeNumber(value);
    case 'string':
      assertWellFormed(value);
      return JSON.stringify(value);
    case 'object': {
      if (ancestors.has(value)) {
        throw new TypeError('canonicalJson: cyclic structure');
      }
      ancestors.add(value);
      try {
        return Array.isArray(value)
          ? serializeArray(value, ancestors)
          : serializeObject(value, ancestors);
      } finally {
        ancestors.delete(value);
      }
    }
    default:
      throw new TypeError(`canonicalJson: unsupported value of type ${typeof value}`);
  }
}

export function canonicalJson(value: unknown): string {
  return serialize(value, new Set());
}
