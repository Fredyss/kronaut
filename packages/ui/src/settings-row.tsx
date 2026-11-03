import { type ReactNode, useId } from 'react';

export interface ControlIds {
  readonly id: string;
  readonly 'aria-describedby'?: string;
}

interface SettingsRowProps {
  readonly label: string;
  readonly description?: string;
  readonly children: ReactNode | ((ids: ControlIds) => ReactNode);
}

export function SettingsRow({ label, description, children }: SettingsRowProps) {
  const id = useId();
  const descriptionId = `${id}-description`;
  const ids = description === undefined ? { id } : { id, 'aria-describedby': descriptionId };
  const labelClass = 'font-medium text-sm';
  return (
    <div className="group/row flex items-center justify-between gap-4 px-6 py-4">
      <div className="flex min-w-0 flex-col gap-0.5">
        {typeof children === 'function' ? (
          <label
            htmlFor={id}
            className={`${labelClass} group-has-[:is(select,button,[type=checkbox],[type=radio]):enabled]/row:group-not-has-[input:not([type=checkbox],[type=radio])]/row:cursor-pointer`}
          >
            {label}
          </label>
        ) : (
          <span className={labelClass}>{label}</span>
        )}
        {description === undefined ? null : (
          <p id={descriptionId} className="text-muted-foreground text-sm">
            {description}
          </p>
        )}
      </div>
      <div className="flex min-w-0 shrink-0 justify-end text-sm">
        {typeof children === 'function' ? children(ids) : children}
      </div>
    </div>
  );
}
