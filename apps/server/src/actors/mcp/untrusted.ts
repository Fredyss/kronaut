import * as z from 'zod';

const UNTRUSTED_SOURCES = ['post', 'provider'] as const;

export type UntrustedSource = (typeof UNTRUSTED_SOURCES)[number];

export const UntrustedText = z.object({
  untrusted: z.literal(true),
  source: z.enum(UNTRUSTED_SOURCES),
  text: z.string(),
});

export type Untrusted = z.output<typeof UntrustedText>;

export function untrusted(source: UntrustedSource, text: string): Untrusted {
  return { untrusted: true, source, text };
}

export function maybeUntrusted(source: UntrustedSource, text: string | null): Untrusted | null {
  return text === null ? null : untrusted(source, text);
}
