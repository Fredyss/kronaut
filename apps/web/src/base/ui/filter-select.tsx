import { Select } from '@kronaut/ui';

interface FilterSelectProps {
  readonly label: string;
  readonly allLabel: string;
  readonly goneLabel: string;
  readonly options: readonly { readonly id: string; readonly name: string }[];
  readonly value: string | undefined;
  onChange(value: string | undefined): void;
}

export function FilterSelect({
  label,
  allLabel,
  goneLabel,
  options,
  value,
  onChange,
}: FilterSelectProps) {
  const known = value === undefined || options.some((option) => option.id === value);
  return (
    <Select
      aria-label={label}
      value={value ?? ''}
      onChange={(event) => onChange(event.currentTarget.value || undefined)}
    >
      <option value="">{allLabel}</option>
      {known ? null : <option value={value}>{goneLabel}</option>}
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.name}
        </option>
      ))}
    </Select>
  );
}
