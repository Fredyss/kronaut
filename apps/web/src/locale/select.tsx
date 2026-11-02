import { useLocale } from './context.ts';
import { isLocale, localeName, locales } from './i18n.ts';

export const SELECT =
  'h-8 rounded-md border border-input bg-background px-2 text-sm shadow-xs focus-visible:outline-2 focus-visible:outline-ring';

interface LocaleSelectProps {
  readonly id: string;
  readonly 'aria-describedby'?: string;
}

export function LocaleSelect(props: LocaleSelectProps) {
  const { locale, choose } = useLocale();
  return (
    <select
      {...props}
      value={locale}
      onChange={(event) => {
        const next = event.currentTarget.value;
        if (isLocale(next)) choose(next);
      }}
      className={SELECT}
    >
      {locales.map((option) => (
        <option key={option} value={option} lang={option}>
          {localeName(option)}
        </option>
      ))}
    </select>
  );
}
