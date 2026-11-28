export type UntrustedSource = 'post' | 'provider';

export interface Untrusted {
  readonly untrusted: true;
  readonly source: UntrustedSource;
  readonly text: string;
}

export function untrusted(source: UntrustedSource, text: string): Untrusted {
  return { untrusted: true, source, text };
}

export function maybeUntrusted(source: UntrustedSource, text: string | null): Untrusted | null {
  return text === null ? null : untrusted(source, text);
}
