import { useLocale } from './context.ts';

const STYLE = { dateStyle: 'medium', timeStyle: 'short' } as const;

export function useFormat(timeZone: string | null) {
  const { locale } = useLocale();
  const format = new Intl.DateTimeFormat(locale, {
    ...STYLE,
    ...(timeZone === null ? {} : { timeZone }),
  });
  return (iso: string) => format.format(new Date(iso));
}

export function useWallFormat() {
  const { locale } = useLocale();
  const format = new Intl.DateTimeFormat(locale, { ...STYLE, timeZone: 'UTC' });
  return (local: string) => format.format(new Date(`${local}Z`));
}
