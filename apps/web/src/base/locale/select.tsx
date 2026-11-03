import { Select } from '@kronaut/ui';
import { useLocale } from './context.ts';
import { isLocale, localeName, locales } from './i18n.ts';

interface LocaleSelectProps {
  readonly id: string;
  readonly 'aria-describedby'?: string;
}

export function LocaleSelect(props: LocaleSelectProps) {
  const { locale, choose } = useLocale();
  return (
    <Select
      {...props}
      value={locale}
      onChange={(event) => {
        const next = event.currentTarget.value;
        if (isLocale(next)) choose(next);
      }}
    >
      {locales.map((option) => (
        <option key={option} value={option} lang={option}>
          {localeName(option)}
        </option>
      ))}
    </Select>
  );
}
