import { type ComponentProps, useId } from 'react';
import { Input } from './input.tsx';
import { Label } from './label.tsx';

type InputProps = Omit<ComponentProps<'input'>, 'id' | 'value' | 'onChange' | 'aria-describedby'>;

export interface TextFieldProps extends InputProps {
  readonly label: string;
  readonly value: string;
  readonly hint?: string | undefined;
  readonly error?: string | undefined;
  onValueChange(value: string): void;
}

export function TextField({ label, value, hint, error, onValueChange, ...input }: TextFieldProps) {
  const id = useId();
  const hintId = useId();
  const errorId = useId();
  const described = [hint === undefined ? null : hintId, error === undefined ? null : errorId]
    .filter((part) => part !== null)
    .join(' ');
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        {...input}
        id={id}
        value={value}
        aria-invalid={error === undefined ? undefined : true}
        aria-describedby={described === '' ? undefined : described}
        onChange={(event) => onValueChange(event.currentTarget.value)}
      />
      {hint === undefined ? null : (
        <p id={hintId} className="text-muted-foreground text-sm">
          {hint}
        </p>
      )}
      {error === undefined ? null : (
        <p id={errorId} className="text-destructive text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
