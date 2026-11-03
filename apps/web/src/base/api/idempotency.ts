export interface Keyed {
  readonly fingerprint: string;
  readonly key: string;
}

export function keyFor(previous: Keyed | null, fingerprint: string): Keyed {
  return previous?.fingerprint === fingerprint
    ? previous
    : { fingerprint, key: crypto.randomUUID() };
}

export function idempotency(keyed: Keyed) {
  return { 'Idempotency-Key': keyed.key };
}
