import * as cs from '@kronaut/i18n/messages/cs';
import * as en from '@kronaut/i18n/messages/en';
import * as sk from '@kronaut/i18n/messages/sk';

const CATALOGS = { en, sk, cs } as const;
type Locale = keyof typeof CATALOGS;
const MAX_RANGES = 20;
const QUALITY = /^q=(0(\.\d{0,3})?|1(\.0{0,3})?)$/;

export interface DeletionStatus {
  readonly completedAt: Date | null;
  readonly matched: number;
}

function isLocale(value: string): value is Locale {
  return Object.hasOwn(CATALOGS, value);
}

function quality(params: readonly string[]): number {
  const q = params.map((param) => param.trim().toLowerCase()).find((p) => p.startsWith('q='));
  if (q === undefined) return 1;
  return QUALITY.test(q) ? Number(q.slice(2)) : 0;
}

export function statusLocale(header: string | null): Locale {
  let best: { locale: Locale; q: number } | null = null;
  for (const range of (header ?? '').split(',').slice(0, MAX_RANGES)) {
    const [tag = '', ...params] = range.split(';');
    const language = tag.trim().toLowerCase().split('-', 1)[0] ?? '';
    const q = quality(params);
    if (q > 0 && isLocale(language) && (best === null || q > best.q))
      best = { locale: language, q };
  }
  return best?.locale ?? 'en';
}

export function statusText(locale: Locale, status: DeletionStatus | null): string {
  const m = CATALOGS[locale];
  if (status === null) return m.meta_status_unknown({});
  if (status.completedAt === null) return m.meta_status_received({});
  if (status.matched === 0) return m.meta_status_none({});
  return m.meta_status_completed({ count: status.matched });
}
