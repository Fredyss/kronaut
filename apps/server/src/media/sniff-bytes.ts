export interface Span {
  readonly start: number;
  readonly end: number;
}

export interface Dimensions {
  readonly width: number;
  readonly height: number;
}

export class CorruptImageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CorruptImageError';
  }
}

export function fail(message: string): never {
  throw new CorruptImageError(message);
}

export function u16be(b: Uint8Array, at: number): number {
  return ((b[at] ?? 0) << 8) | (b[at + 1] ?? 0);
}

export function u32be(b: Uint8Array, at: number): number {
  return (
    (((b[at] ?? 0) << 24) |
      ((b[at + 1] ?? 0) << 16) |
      ((b[at + 2] ?? 0) << 8) |
      (b[at + 3] ?? 0)) >>>
    0
  );
}

export function u16le(b: Uint8Array, at: number): number {
  return (b[at] ?? 0) | ((b[at + 1] ?? 0) << 8);
}

export function u24le(b: Uint8Array, at: number): number {
  return (b[at] ?? 0) | ((b[at + 1] ?? 0) << 8) | ((b[at + 2] ?? 0) << 16);
}

export function u32le(b: Uint8Array, at: number): number {
  return (u24le(b, at) | ((b[at + 3] ?? 0) << 24)) >>> 0;
}

export function ascii(b: Uint8Array, at: number, length: number): string {
  return String.fromCharCode(...b.subarray(at, at + length));
}

export function startsWith(b: Uint8Array, at: number, prefix: readonly number[]): boolean {
  if (at + prefix.length > b.length) return false;
  return prefix.every((value, i) => b[at + i] === value);
}
