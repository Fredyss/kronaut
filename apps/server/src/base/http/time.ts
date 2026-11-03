import { Temporal } from 'temporal-polyfill';

export function iso(value: Date | null): string | null {
  return value === null ? null : value.toISOString();
}

export function plainLocal(value: string | null): string | null {
  return value === null ? null : Temporal.PlainDateTime.from(value.replace(' ', 'T')).toString();
}
