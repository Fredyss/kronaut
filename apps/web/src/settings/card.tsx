import { Card } from '@kronaut/ui';
import { type ReactNode, useId } from 'react';

export function SettingsPage({
  title,
  intro,
  children,
}: {
  readonly title: string;
  readonly intro?: string;
  readonly children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h2 className="font-semibold text-xl tracking-tight">{title}</h2>
        {intro === undefined ? null : <p className="text-muted-foreground text-sm">{intro}</p>}
      </header>
      {children}
    </section>
  );
}

interface SettingsCardProps {
  readonly title: string;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
}

export function SettingsCard({ title, children, footer }: SettingsCardProps) {
  const id = useId();
  return (
    <section aria-labelledby={id}>
      <Card className="gap-0 py-0">
        <h3 id={id} className="border-b px-6 py-4 font-semibold">
          {title}
        </h3>
        <div className="flex flex-col divide-y">{children}</div>
        {footer === undefined ? null : (
          <div className="flex flex-col gap-3 border-t px-6 py-4">{footer}</div>
        )}
      </Card>
    </section>
  );
}

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
    <div className="flex items-center justify-between gap-4 px-6 py-4">
      <div className="flex min-w-0 flex-col gap-0.5">
        {typeof children === 'function' ? (
          <label htmlFor={id} className={labelClass}>
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
